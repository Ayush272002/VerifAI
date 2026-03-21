// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract VerifAIMarketplace {
    address public oracle; // AI agent wallet — only one allowed to submit rulings

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle");
        _;
    }

    constructor(address _oracle) {
        oracle = _oracle;
    }

    struct Service {
        string title;
        string description;
        uint256 priceWei; // price the provider charges per job
        bool active; // soft-delete: set false to "remove"
    }

    // Core registry: provider address → list of services
    mapping(address => Service[]) public providerServices;

    // Global registry for frontend search/discovery
    address[] public allProviders;
    mapping(address => bool) public isProviderKnown;

    event ServiceAdded(
        address indexed provider,
        uint256 indexed serviceIndex,
        string title,
        uint256 priceWei
    );
    event ServiceRemoved(
        address indexed provider,
        uint256 indexed serviceIndex
    );

    function addService(
        string calldata title,
        string calldata description,
        uint256 priceWei
    ) external returns (uint256 index) {
        require(bytes(title).length > 0, "Title required");
        require(priceWei > 0, "Price must be > 0");

        if (!isProviderKnown[msg.sender]) {
            isProviderKnown[msg.sender] = true;
            allProviders.push(msg.sender);
        }

        providerServices[msg.sender].push(
            Service({
                title: title,
                description: description,
                priceWei: priceWei,
                active: true
            })
        );

        index = providerServices[msg.sender].length - 1;
        emit ServiceAdded(msg.sender, index, title, priceWei);
    }

    function removeService(uint256 serviceIndex) external {
        Service storage svc = providerServices[msg.sender][serviceIndex];
        require(svc.active, "Already removed");
        svc.active = false;
        emit ServiceRemoved(msg.sender, serviceIndex);
    }

    function getServices(
        address provider
    ) external view returns (Service[] memory) {
        return providerServices[provider];
    }

    function getAllProviders() external view returns (address[] memory) {
        return allProviders;
    }

    struct GlobalServiceView {
        address provider;
        uint256 serviceIndex;
        string title;
        string description;
        uint256 priceWei;
        bool active;
    }

    function getAllActiveServices()
        external
        view
        returns (GlobalServiceView[] memory)
    {
        uint256 totalActive = 0;
        for (uint256 i = 0; i < allProviders.length; i++) {
            address p = allProviders[i];
            for (uint256 j = 0; j < providerServices[p].length; j++) {
                if (providerServices[p][j].active) {
                    totalActive++;
                }
            }
        }

        GlobalServiceView[] memory result = new GlobalServiceView[](
            totalActive
        );
        uint256 count = 0;

        for (uint256 i = 0; i < allProviders.length; i++) {
            address p = allProviders[i];
            for (uint256 j = 0; j < providerServices[p].length; j++) {
                if (providerServices[p][j].active) {
                    result[count] = GlobalServiceView({
                        provider: p,
                        serviceIndex: j,
                        title: providerServices[p][j].title,
                        description: providerServices[p][j].description,
                        priceWei: providerServices[p][j].priceWei,
                        active: true
                    });
                    count++;
                }
            }
        }
        return result;
    }

    enum RequestStatus {
        Pending, // B requested; A hasn't decided
        Accepted, // A accepted; work in progress
        Rejected, // A rejected; ETH refunded to B
        PendingReview, // A uploaded proof; oracle is reviewing
        Resolved // Oracle issued ruling; ETH paid to winner
    }

    struct ServiceRequest {
        address payable client; // B
        address payable provider; // A
        uint256 serviceIndex; // index into providerServices[provider]
        string clientNote; // B's custom text input at request time
        uint256 escrowAmount; // ETH locked by B
        RequestStatus status;
        string completionProofCid; // IPFS CID uploaded by A as proof of work
        bytes32 rulingHash; // SHA-256 of AI ruling (set by oracle)
        address winner; // set by oracle if disputed
        bool fundsReleased;
    }

    mapping(bytes32 => ServiceRequest) public requests;

    event ServiceRequested(
        bytes32 indexed requestId,
        address indexed client,
        address indexed provider,
        uint256 serviceIndex,
        uint256 escrowAmount,
        string clientNote
    );
    event RequestAccepted(bytes32 indexed requestId, address indexed provider);
    event RequestRejected(bytes32 indexed requestId, address indexed provider);
    event ProofSubmitted(
        bytes32 indexed requestId,
        address indexed provider,
        string proofCid
    );
    event RulingSubmitted(
        bytes32 indexed requestId,
        address indexed winner,
        bytes32 rulingHash
    );
    event FundsReleased(
        bytes32 indexed requestId,
        address indexed recipient,
        uint256 amount
    );

    // Helper: Get all requests where msg.sender is the client
    mapping(address => bytes32[]) private clientRequests;
    // Helper: Get all requests where msg.sender is the provider
    mapping(address => bytes32[]) private providerRequests;

    function requestService(
        address payable provider,
        uint256 serviceIndex,
        string calldata clientNote
    ) external payable returns (bytes32 requestId) {
        Service storage svc = providerServices[provider][serviceIndex];
        require(svc.active, "Service not active");
        require(msg.value == svc.priceWei, "Must send exact service price");
        require(msg.sender != provider, "Provider cannot request own service");

        requestId = keccak256(
            abi.encodePacked(
                block.timestamp,
                msg.sender,
                provider,
                serviceIndex
            )
        );
        require(
            requests[requestId].client == address(0),
            "Request ID collision"
        );

        requests[requestId] = ServiceRequest({
            client: payable(msg.sender),
            provider: provider,
            serviceIndex: serviceIndex,
            clientNote: clientNote,
            escrowAmount: msg.value,
            status: RequestStatus.Pending,
            completionProofCid: "",
            rulingHash: bytes32(0),
            winner: address(0),
            fundsReleased: false
        });

        // Track requests for easier lookup
        clientRequests[msg.sender].push(requestId);
        providerRequests[provider].push(requestId);

        emit ServiceRequested(
            requestId,
            msg.sender,
            provider,
            serviceIndex,
            msg.value,
            clientNote
        );
    }

    function acceptRequest(bytes32 requestId) external {
        ServiceRequest storage req = requests[requestId];
        require(msg.sender == req.provider, "Only provider");
        require(req.status == RequestStatus.Pending, "Not pending");

        req.status = RequestStatus.Accepted;
        emit RequestAccepted(requestId, msg.sender);
    }

    function rejectRequest(bytes32 requestId) external {
        ServiceRequest storage req = requests[requestId];
        require(msg.sender == req.provider, "Only provider");
        require(req.status == RequestStatus.Pending, "Not pending");

        req.status = RequestStatus.Rejected;
        req.fundsReleased = true;

        (bool ok, ) = req.client.call{value: req.escrowAmount}("");
        require(ok, "Refund failed");

        emit RequestRejected(requestId, msg.sender);
        emit FundsReleased(requestId, req.client, req.escrowAmount);
    }

    // Provider uploads proof — ETH stays locked, oracle takes it from here.
    function completeRequest(
        bytes32 requestId,
        string calldata proofCid
    ) external {
        ServiceRequest storage req = requests[requestId];
        require(msg.sender == req.provider, "Only provider");
        require(req.status == RequestStatus.Accepted, "Must be accepted first");
        require(bytes(proofCid).length > 0, "Proof CID required");

        req.completionProofCid = proofCid;
        req.status = RequestStatus.PendingReview;
        // Funds stay in escrow — oracle will decide the winner.

        emit ProofSubmitted(requestId, msg.sender, proofCid);
    }

    // Oracle fetches proof from IPFS, evaluates it against clientNote,
    // picks winner, and pays them — all in one transaction.
    function submitRuling(
        bytes32 requestId,
        bytes32 rulingHash,
        address payable winner
    ) external onlyOracle {
        ServiceRequest storage req = requests[requestId];
        require(
            req.status == RequestStatus.PendingReview,
            "Not pending oracle review"
        );
        require(!req.fundsReleased, "Funds already released");
        require(
            winner == req.client || winner == req.provider,
            "Winner must be a party"
        );

        req.rulingHash = rulingHash;
        req.winner = winner;
        req.status = RequestStatus.Resolved;
        req.fundsReleased = true;

        (bool ok, ) = winner.call{value: req.escrowAmount}("");
        require(ok, "Payment failed");

        emit RulingSubmitted(requestId, winner, rulingHash);
        emit FundsReleased(requestId, winner, req.escrowAmount);
    }

    struct Message {
        address sender;
        string text;
        uint256 timestamp;
    }

    // requestId → ordered list of messages
    mapping(bytes32 => Message[]) public requestMessages;

    event MessagePosted(
        bytes32 indexed requestId,
        address indexed sender,
        uint256 messageIndex,
        string text
    );

    function postMessage(
        bytes32 requestId,
        string calldata text
    ) external returns (uint256 messageIndex) {
        ServiceRequest storage req = requests[requestId];
        require(
            msg.sender == req.client || msg.sender == req.provider,
            "Not a party to this request"
        );
        require(
            req.status == RequestStatus.Pending ||
                req.status == RequestStatus.Accepted ||
                req.status == RequestStatus.PendingReview,
            "Cannot message on closed request"
        );
        require(bytes(text).length > 0, "Empty message");

        messageIndex = requestMessages[requestId].length;
        requestMessages[requestId].push(
            Message({
                sender: msg.sender,
                text: text,
                timestamp: block.timestamp
            })
        );

        emit MessagePosted(requestId, msg.sender, messageIndex, text);
    }

    function getMessages(
        bytes32 requestId
    ) external view returns (Message[] memory) {
        return requestMessages[requestId];
    }

    // Get all requests for a client
    function getClientRequests(
        address client
    ) external view returns (bytes32[] memory) {
        return clientRequests[client];
    }

    // Get all requests for a provider
    function getProviderRequests(
        address provider
    ) external view returns (bytes32[] memory) {
        return providerRequests[provider];
    }

    // Get pending requests only
    function getPendingRequests(
        address user,
        bool asClient
    ) external view returns (bytes32[] memory) {
        bytes32[] memory allUserRequests = asClient
            ? clientRequests[user]
            : providerRequests[user];
        bytes32[] memory pending = new bytes32[](allUserRequests.length);
        uint256 count = 0;

        for (uint256 i = 0; i < allUserRequests.length; i++) {
            if (requests[allUserRequests[i]].status == RequestStatus.Pending) {
                pending[count] = allUserRequests[i];
                count++;
            }
        }

        // Return array with actual pending count
        bytes32[] memory result = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = pending[i];
        }
        return result;
    }
}
