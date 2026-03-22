"use client";

import { useState, KeyboardEvent } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { X, Plus, Clock, Loader2 } from "lucide-react";
import { useAddService } from "@/lib/marketplace";
import { EthIcon } from "@/components/EthIcon";
import { GIG_CATEGORIES, getRandomPlaceholderImage } from "@/lib/gigCategories";
import { usePublicClient } from "wagmi";

interface PublishServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SPRING = {
  type: "spring",
  damping: 20,
  stiffness: 100,
} as const;

export function PublishServiceModal({
  isOpen,
  onClose,
}: PublishServiceModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    priceType: "fixed" as "fixed" | "hourly",
    priceAmount: "",
    deliveryTime: "",
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [deliverables, setDeliverables] = useState<
    { id: string; text: string }[]
  >([{ id: Math.random().toString(), text: "" }]);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [classificationError, setClassificationError] = useState("");

  const validDeliverables = deliverables.filter((d) => d.text.trim() !== "");

  // Auto-generate background image based on category
  const backgroundImage = formData.category
    ? getRandomPlaceholderImage(formData.category)
    : null;

  const handleAutoCategorize = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      setClassificationError(
        "Title and description are required for classification.",
      );
      return;
    }

    setIsCategorizing(true);
    setClassificationError("");

    try {
      const res = await fetch("http://localhost:8000/agent/classify-gig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          tags,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Classification failed: ${res.status} ${text}`);
      }

      const data = await res.json();
      if (data.category) {
        setFormData({ ...formData, category: data.category });
      } else {
        throw new Error("No category returned from classification endpoint.");
      }
    } catch (err) {
      setClassificationError(`Auto-categorization failed: ${err}`);
      console.error(err);
    } finally {
      setIsCategorizing(false);
    }
  };

  const isFormValid =
    formData.title.trim() !== "" &&
    formData.category !== "" &&
    formData.description.trim() !== "" &&
    formData.priceAmount !== "" &&
    parseFloat(formData.priceAmount) > 0 &&
    formData.deliveryTime.trim() !== "" &&
    tags.length > 0 &&
    validDeliverables.length > 0;

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const updateDeliverable = (id: string, value: string) => {
    setDeliverables(
      deliverables.map((d) => (d.id === id ? { ...d, text: value } : d)),
    );
  };

  const addDeliverable = () => {
    setDeliverables([
      ...deliverables,
      { id: Math.random().toString(), text: "" },
    ]);
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>(
        'input[data-feature="deliverable"]',
      );
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    }, 0);
  };

  const removeDeliverable = (id: string, index: number) => {
    let newDeliverables = deliverables.filter((d) => d.id !== id);
    if (newDeliverables.length === 0) {
      newDeliverables = [{ id: Math.random().toString(), text: "" }];
    }
    setDeliverables(newDeliverables);
  };

  const handleDeliverableKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (deliverables[index].text.trim() !== "") {
        const newId = Math.random().toString();
        const newDeliverables = [...deliverables];
        newDeliverables.splice(index + 1, 0, { id: newId, text: "" });
        setDeliverables(newDeliverables);

        setTimeout(() => {
          const inputs = document.querySelectorAll<HTMLInputElement>(
            'input[data-feature="deliverable"]',
          );
          if (inputs[index + 1]) inputs[index + 1].focus();
        }, 0);
      }
    } else if (e.key === "Backspace" && deliverables[index].text === "") {
      e.preventDefault();
      const idToRemove = deliverables[index].id;
      removeDeliverable(idToRemove, index);
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>(
          'input[data-feature="deliverable"]',
        );
        if (inputs[index - 1]) inputs[index - 1].focus();
      }, 0);
    }
  };

  const { addService, isPending } = useAddService();
  const publicClient = usePublicClient();
  const [isConfirming, setIsConfirming] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isPending || isConfirming) return;

    try {
      // Step 1: Verify form with Toast's endpoint
      console.log("Verifying service form...");
      const verifyRes = await fetch(
        "http://localhost:8000/agent/verify/form/service",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            tags,
            category: formData.category,
          }),
        },
      );

      if (!verifyRes.ok) {
        try {
          const errorData = await verifyRes.json();
          // Extract the detail message from FastAPI's HTTPException response
          const errorMessage = errorData.detail[0].msg || "Form validation failed";
          toast.error(`Validation failed: ${errorMessage}`);
        } catch {
          toast.error("Form verification failed. Please check your inputs.");
        }
        return;
      }

      const verifyData = await verifyRes.json();
      console.log("Form verification result:", verifyData);
      toast.success("Form verified successfully!");

      // Step 2: Proceed with blockchain submission
      const resolvedBackgroundImage =
        backgroundImage ||
        getRandomPlaceholderImage(formData.category);

      const deliverablesText = validDeliverables
        .map((d, i) => `${i + 1}. ${d.text}`)
        .join("\n");
      const fullDescription = `${formData.description}\n\nWhat You'll Get:\n${deliverablesText}\n\nCategory: ${formData.category}\nDelivery Time: ${formData.deliveryTime}\nTags: ${tags.join(", ")}`;

      setIsConfirming(true);
      toast.info("Submitting transaction securely...");
      const txHash = await addService(
        formData.title,
        fullDescription,
        formData.priceAmount,
      );

      toast.info("Awaiting block confirmation...");
      if (!publicClient) throw new Error("Public client not available");
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      if (receipt.status !== "success") {
        throw new Error("Transaction reverted on-chain");
      }

      console.log("Service published on-chain:", {
        ...formData,
        backgroundImage: resolvedBackgroundImage,
        tags,
        receipt,
      });
      toast.success("Service Published!", {
        description: "Your service is now live",
      });
      onClose();
      // Reset form
      setFormData({
        title: "",
        category: "",
        description: "",
        priceType: "fixed",
        priceAmount: "",
        deliveryTime: "",
      });
      setTags([]);
      setTagInput("");
      setDeliverables([{ id: Math.random().toString(), text: "" }]);
    } catch (err: any) {
      // Handle user-rejected transaction
      if (
        err?.message?.includes("User rejected the request") ||
        err?.code === 4001
      ) {
        toast.error("Transaction cancelled by user.");
      } else {
        console.error("Failed to publish service to blockchain:", err);
        toast.error("Failed to publish service: " + (err?.message || err));
      }
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-100"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-101 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={SPRING}
              className="glass-macos rounded-3xl w-full max-w-3xl max-h-[90vh] pointer-events-auto shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="relative p-6 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-black dark:text-white">
                      Publish your service
                    </h2>
                    <p className="text-sm text-black/60 dark:text-white/60">
                      Share your expertise with the community
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={SPRING}
                    onClick={onClose}
                    className="w-10 h-10 rounded-full glass-macos glass-macos-hover flex items-center justify-center text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="flex-1 overflow-y-auto custom-scrollbar"
              >
                <div className="p-6 space-y-6">
                  {/* Service Title */}
                  <div>
                    <label className="block text-sm font-semibold text-black dark:text-white mb-2">
                      Service Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="e.g., Full-Stack Web Development - React, Node.js"
                      className="w-full glass-input px-4 py-3 rounded-xl text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none transition-all border border-black/10 dark:border-white/10 focus:border-black/20 dark:focus:border-white/20"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-black dark:text-white mb-2">
                      Description *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Describe your service, what you offer, and what makes you stand out..."
                      className="w-full glass-input px-4 py-3 rounded-xl text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none transition-all resize-none border border-black/10 dark:border-white/10 focus:border-black/20 dark:focus:border-white/20"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-black dark:text-white mb-2">
                      Category *
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      <select
                        required
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        className="flex-1 glass-input px-4 py-3 rounded-xl text-black dark:text-white outline-none transition-all border border-black/10 dark:border-white/10 focus:border-black/20 dark:focus:border-white/20"
                      >
                        <option value="">Select a category</option>
                        {GIG_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAutoCategorize}
                        disabled={isCategorizing}
                        className="btn-macos min-w-[170px] px-3 py-2 text-sm"
                      >
                        {isCategorizing ? "Classifying..." : "Auto categorise"}
                      </button>
                    </div>
                    {classificationError && (
                      <p className="text-xs mt-2 text-red-600 dark:text-red-400">
                        {classificationError}
                      </p>
                    )}
                  </div>

                  {/* What You'll Deliver */}
                  <div>
                    <label className="block text-sm font-semibold text-black dark:text-white mb-2">
                      What You'll Deliver *
                    </label>
                    <div className="space-y-3">
                      <div className="glass-macos rounded-xl p-4 flex flex-col gap-3">
                        <AnimatePresence initial={false}>
                          {deliverables.map((deliverable, idx) => (
                            <motion.div
                              layout
                              key={deliverable.id}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{
                                opacity: 0,
                                height: 0,
                                overflow: "hidden",
                              }}
                              transition={{ duration: 0.2 }}
                              className="flex items-center gap-3 group"
                            >
                              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                                  {idx + 1}
                                </span>
                              </div>
                              <input
                                data-feature="deliverable"
                                type="text"
                                value={deliverable.text}
                                onChange={(e) =>
                                  updateDeliverable(
                                    deliverable.id,
                                    e.target.value,
                                  )
                                }
                                onKeyDown={(e) =>
                                  handleDeliverableKeyDown(e, idx)
                                }
                                placeholder="E.g., Fully functional website"
                                className="flex-1 bg-transparent border-b border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20 focus:border-cyan-500 text-sm text-black dark:text-white pt-1 pb-1 outline-none transition-all placeholder:text-black/30 dark:placeholder:text-white/30"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  removeDeliverable(deliverable.id, idx)
                                }
                                className={`opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-1 transition-all ${deliverables.length === 1 && deliverable.text === "" ? "invisible" : ""}`}
                              >
                                <X className="w-4 h-4 text-black/60 dark:text-white/60" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <button
                          type="button"
                          onClick={addDeliverable}
                          className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1 hover:underline px-1"
                        >
                          <Plus className="w-3 h-3" /> Add another item
                        </button>
                        <p className="text-xs text-black/50 dark:text-white/50">
                          Press Enter to add a new line
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-black dark:text-white mb-2">
                        Pricing Type *
                      </label>
                      <div className="flex gap-2">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() =>
                            setFormData({ ...formData, priceType: "fixed" })
                          }
                          className={`flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                            formData.priceType === "fixed"
                              ? "glass-macos ring-2 ring-cyan-500/50 text-cyan-600 dark:text-cyan-400"
                              : "glass-macos text-black/60 dark:text-white/60"
                          }`}
                        >
                          Fixed Price
                        </motion.button>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() =>
                            setFormData({ ...formData, priceType: "hourly" })
                          }
                          className={`flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                            formData.priceType === "hourly"
                              ? "glass-macos ring-2 ring-cyan-500/50 text-cyan-600 dark:text-cyan-400"
                              : "glass-macos text-black/60 dark:text-white/60"
                          }`}
                        >
                          Hourly Rate
                        </motion.button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-black dark:text-white mb-2">
                        Price (ETH) *
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <EthIcon className="w-5 h-5" />
                        </div>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.001"
                          value={formData.priceAmount}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow numbers and decimal point
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              setFormData({ ...formData, priceAmount: value });
                            }
                          }}
                          onKeyDown={(e) => {
                            // Prevent 'e', 'E', '+', '-' which are valid in number inputs but we don't want
                            if (["e", "E", "+", "-"].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          placeholder="0.5"
                          className="w-full glass-input pl-10 pr-4 py-3 rounded-xl text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none transition-all border border-black/10 dark:border-white/10 focus:border-black/20 dark:focus:border-white/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delivery Time */}
                  <div>
                    <label className="block text-sm font-semibold text-black dark:text-white mb-2">
                      Delivery Time *
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/50 dark:text-white/50" />
                      <input
                        type="text"
                        required
                        value={formData.deliveryTime}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            deliveryTime: e.target.value,
                          })
                        }
                        placeholder="e.g., 7 days, 2 weeks, Flexible"
                        className="w-full glass-input pl-10 pr-4 py-3 rounded-xl text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none transition-all border border-black/10 dark:border-white/10 focus:border-black/20 dark:focus:border-white/20"
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-semibold text-black dark:text-white mb-2">
                      Skills & Tags *
                    </label>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        placeholder="Type a tag and press Enter..."
                        className="w-full glass-input px-4 py-3 rounded-xl text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none transition-all border border-black/10 dark:border-white/10 focus:border-black/20 dark:focus:border-white/20"
                      />
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <motion.div
                              key={tag}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="px-3 py-1.5 rounded-lg glass-macos text-sm font-medium text-black dark:text-white flex items-center gap-2"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-black/50 dark:text-white/50">
                        Press Enter to add each tag
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-black/5 dark:border-white/5 p-6 flex justify-end gap-3 bg-white/50 dark:bg-black/50">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-2xl glass-macos text-black/70 dark:text-white/70 font-semibold text-sm"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={!isFormValid || isPending || isConfirming}
                    whileHover={
                      isFormValid && !isPending && !isConfirming
                        ? { scale: 1.02 }
                        : {}
                    }
                    whileTap={
                      isFormValid && !isPending && !isConfirming
                        ? { scale: 0.98 }
                        : {}
                    }
                    className={`px-8 py-2.5 rounded-2xl font-semibold text-sm flex items-center gap-2 transition-all ${
                      isFormValid && !isPending && !isConfirming
                        ? "btn-macos"
                        : "bg-gray-400/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isPending || isConfirming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    {isPending
                      ? "Confirming in Wallet..."
                      : isConfirming
                        ? "Confirming on-chain..."
                        : "Publish Service"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
