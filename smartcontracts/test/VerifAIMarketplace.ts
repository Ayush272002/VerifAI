import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("VerifAIMarketplace", function () {
  async function deployFixture() {
    const [oracle, providerA, clientB, randomPerson] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("VerifAIMarketplace");
    const marketplace = await Factory.deploy(oracle.address);

    return { marketplace, oracle, providerA, clientB, randomPerson };
  }

  // Helper: A lists a service, B requests it → returns requestId and price
  async function setupWithRequest(marketplace: any, providerA: any, clientB: any) {
    const price = ethers.parseEther("1");

    await marketplace.connect(providerA).addService(
      "Smart Contract Audit",
      "I will audit your Solidity contracts",
      price
    );

    await marketplace
      .connect(clientB)
      .requestService(providerA.address, 0, "Please audit my NFT contract", { value: price });

    const events = await marketplace.queryFilter(marketplace.filters.ServiceRequested(), -1);
    const requestId = events[0].args[0];

    return { requestId, price };
  }

  // ─────────────────────────────────────────────
  // Deployment
  // ─────────────────────────────────────────────

  describe("Deployment", function () {
    it("Should set the oracle", async function () {
      const { marketplace, oracle } = await deployFixture();
      expect(await marketplace.oracle()).to.equal(oracle.address);
    });
  });

  // ─────────────────────────────────────────────
  // Service Registry
  // ─────────────────────────────────────────────

  describe("Service Registry", function () {
    it("Provider can add a service", async function () {
      const { marketplace, providerA } = await deployFixture();
      const price = ethers.parseEther("1");

      await expect(marketplace.connect(providerA).addService("Audit", "Security audit", price))
        .to.emit(marketplace, "ServiceAdded")
        .withArgs(providerA.address, 0, "Audit", price);

      const services = await marketplace.getServices(providerA.address);
      expect(services.length).to.equal(1);
      expect(services[0].title).to.equal("Audit");
      expect(services[0].active).to.be.true;
    });

    it("Provider can remove a service", async function () {
      const { marketplace, providerA } = await deployFixture();

      await marketplace.connect(providerA).addService("Audit", "desc", ethers.parseEther("1"));

      await expect(marketplace.connect(providerA).removeService(0))
        .to.emit(marketplace, "ServiceRemoved")
        .withArgs(providerA.address, 0);

      const services = await marketplace.getServices(providerA.address);
      expect(services[0].active).to.be.false;
    });

    it("Client cannot request a removed service", async function () {
      const { marketplace, providerA, clientB } = await deployFixture();
      const price = ethers.parseEther("1");

      await marketplace.connect(providerA).addService("Audit", "desc", price);
      await marketplace.connect(providerA).removeService(0);

      await expect(
        marketplace.connect(clientB).requestService(providerA.address, 0, "note", { value: price })
      ).to.be.revertedWith("Service not active");
    });
  });

  // ─────────────────────────────────────────────
  // Reject Flow
  // ─────────────────────────────────────────────

  describe("Reject Flow", function () {
    it("Provider rejects → client refunded", async function () {
      const { marketplace, providerA, clientB } = await deployFixture();
      const { requestId, price } = await setupWithRequest(marketplace, providerA, clientB);

      const balanceBefore = await ethers.provider.getBalance(clientB.address);

      await expect(marketplace.connect(providerA).rejectRequest(requestId))
        .to.emit(marketplace, "RequestRejected")
        .withArgs(requestId, providerA.address);

      const balanceAfter = await ethers.provider.getBalance(clientB.address);
      expect(balanceAfter - balanceBefore).to.equal(price);

      const req = await marketplace.requests(requestId);
      expect(req.status).to.equal(2); // Rejected
    });
  });

  // ─────────────────────────────────────────────
  // Accept → Complete (proof upload) → AI Oracle rules → paid
  // ─────────────────────────────────────────────

  describe("Accept → Proof → Oracle Rules", function () {
    it("Full happy path: oracle pays provider when proof is valid", async function () {
      const { marketplace, oracle, providerA, clientB } = await deployFixture();
      const { requestId, price } = await setupWithRequest(marketplace, providerA, clientB);

      // A accepts
      await expect(marketplace.connect(providerA).acceptRequest(requestId))
        .to.emit(marketplace, "RequestAccepted")
        .withArgs(requestId, providerA.address);

      // A uploads proof — ETH stays locked
      await expect(
        marketplace.connect(providerA).completeRequest(requestId, "ipfs://QmProof123")
      )
        .to.emit(marketplace, "ProofSubmitted")
        .withArgs(requestId, providerA.address, "ipfs://QmProof123");

      // Status is now PendingReview (3), funds still in contract
      let req = await marketplace.requests(requestId);
      expect(req.status).to.equal(3); // PendingReview
      expect(req.fundsReleased).to.be.false;

      // Oracle reviews proof, pays provider
      const rulingHash = ethers.id("Proof verified — provider wins");
      const balanceBefore = await ethers.provider.getBalance(providerA.address);

      await expect(
        marketplace.connect(oracle).submitRuling(requestId, rulingHash, providerA.address)
      )
        .to.emit(marketplace, "RulingSubmitted")
        .withArgs(requestId, providerA.address, rulingHash)
        .and.to.emit(marketplace, "FundsReleased")
        .withArgs(requestId, providerA.address, price);

      const balanceAfter = await ethers.provider.getBalance(providerA.address);
      expect(balanceAfter).to.be.gt(balanceBefore);

      req = await marketplace.requests(requestId);
      expect(req.status).to.equal(4); // Resolved
      expect(req.fundsReleased).to.be.true;
    });

    it("Oracle can also rule in favour of client (bad proof)", async function () {
      const { marketplace, oracle, providerA, clientB } = await deployFixture();
      const { requestId, price } = await setupWithRequest(marketplace, providerA, clientB);

      await marketplace.connect(providerA).acceptRequest(requestId);
      await marketplace.connect(providerA).completeRequest(requestId, "ipfs://QmFakeProof");

      const rulingHash = ethers.id("Proof insufficient — client wins");
      const balanceBefore = await ethers.provider.getBalance(clientB.address);

      await expect(
        marketplace.connect(oracle).submitRuling(requestId, rulingHash, clientB.address)
      )
        .to.emit(marketplace, "FundsReleased")
        .withArgs(requestId, clientB.address, price);

      const balanceAfter = await ethers.provider.getBalance(clientB.address);
      expect(balanceAfter - balanceBefore).to.equal(price);
    });

    it("Cannot complete without accepting first", async function () {
      const { marketplace, providerA, clientB } = await deployFixture();
      const { requestId } = await setupWithRequest(marketplace, providerA, clientB);

      await expect(
        marketplace.connect(providerA).completeRequest(requestId, "ipfs://QmProof")
      ).to.be.revertedWith("Must be accepted first");
    });

    it("Non-oracle cannot submit ruling", async function () {
      const { marketplace, providerA, clientB } = await deployFixture();
      const { requestId } = await setupWithRequest(marketplace, providerA, clientB);

      await marketplace.connect(providerA).acceptRequest(requestId);
      await marketplace.connect(providerA).completeRequest(requestId, "ipfs://QmProof");

      await expect(
        marketplace.connect(providerA).submitRuling(requestId, ethers.id("x"), providerA.address)
      ).to.be.revertedWith("Only oracle");
    });

    it("Oracle cannot rule before proof is uploaded", async function () {
      const { marketplace, oracle, providerA, clientB } = await deployFixture();
      const { requestId } = await setupWithRequest(marketplace, providerA, clientB);

      await marketplace.connect(providerA).acceptRequest(requestId);

      await expect(
        marketplace.connect(oracle).submitRuling(requestId, ethers.id("x"), providerA.address)
      ).to.be.revertedWith("Not pending oracle review");
    });
  });

  // ─────────────────────────────────────────────
  // On-chain Q&A / Messaging
  // ─────────────────────────────────────────────

  describe("On-chain Messaging", function () {
    it("Both parties can post messages — each is its own txn", async function () {
      const { marketplace, providerA, clientB } = await deployFixture();
      const { requestId } = await setupWithRequest(marketplace, providerA, clientB);

      await expect(marketplace.connect(clientB).postMessage(requestId, "What's your timeline?"))
        .to.emit(marketplace, "MessagePosted")
        .withArgs(requestId, clientB.address, 0, "What's your timeline?");

      await expect(marketplace.connect(providerA).postMessage(requestId, "3 business days."))
        .to.emit(marketplace, "MessagePosted")
        .withArgs(requestId, providerA.address, 1, "3 business days.");

      const msgs = await marketplace.getMessages(requestId);
      expect(msgs.length).to.equal(2);
      expect(msgs[0].sender).to.equal(clientB.address);
      expect(msgs[1].sender).to.equal(providerA.address);
    });

    it("Messaging also works while oracle is reviewing (PendingReview)", async function () {
      const { marketplace, providerA, clientB } = await deployFixture();
      const { requestId } = await setupWithRequest(marketplace, providerA, clientB);

      await marketplace.connect(providerA).acceptRequest(requestId);
      await marketplace.connect(providerA).completeRequest(requestId, "ipfs://QmProof");

      // Both can still message while oracle is reviewing
      await expect(marketplace.connect(clientB).postMessage(requestId, "I'm not satisfied"))
        .to.emit(marketplace, "MessagePosted");
    });

    it("Random person cannot post messages", async function () {
      const { marketplace, providerA, clientB, randomPerson } = await deployFixture();
      const { requestId } = await setupWithRequest(marketplace, providerA, clientB);

      await expect(
        marketplace.connect(randomPerson).postMessage(requestId, "Spam")
      ).to.be.revertedWith("Not a party to this request");
    });
  });
});
