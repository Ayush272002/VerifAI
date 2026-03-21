/**
 * @fileoverview Publish Service Modal Component
 * Allows service providers to publish their services
 */

"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Plus, Clock, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PublishServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SPRING = {
  type: "spring",
  damping: 20,
  stiffness: 100,
} as const;

const CATEGORIES = [
  "Web Development",
  "Design & Creative",
  "Content Writing",
  "Marketing",
  "Consulting",
  "Blockchain Development",
  "Mobile Development",
  "Video & Animation",
  "Data Science & AI",
];

export function PublishServiceModal({ isOpen, onClose }: PublishServiceModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    priceType: "fixed" as "fixed" | "hourly",
    priceAmount: "",
    deliveryTime: "",
    backgroundImage: null as string | null,
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFormValid =
    formData.title.trim() !== "" &&
    formData.category !== "" &&
    formData.description.trim() !== "" &&
    formData.priceAmount !== "" &&
    parseFloat(formData.priceAmount) > 0 &&
    formData.deliveryTime.trim() !== "" &&
    tags.length > 0;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, backgroundImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    console.log("Service published:", { ...formData, tags });
    // TODO: Add actual submission logic here
    setShowConfirmation(true);
    setTimeout(() => {
      setShowConfirmation(false);
      onClose();
      // Reset form
      setFormData({
        title: "",
        category: "",
        description: "",
        priceType: "fixed",
        priceAmount: "",
        deliveryTime: "",
        backgroundImage: null,
      });
      setTags([]);
      setTagInput("");
    }, 2500);
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
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
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
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
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
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Full-Stack Web Development - React, Node.js"
                      className="w-full glass-search px-4 py-3 rounded-xl text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-black dark:text-white mb-2">
                      Category *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full glass-search px-4 py-3 rounded-xl text-black dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    >
                      <option value="">Select a category</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
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
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your service, what you offer, and what makes you stand out..."
                      className="w-full glass-search px-4 py-3 rounded-xl text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all resize-none"
                    />
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
                          onClick={() => setFormData({ ...formData, priceType: "fixed" })}
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
                          onClick={() => setFormData({ ...formData, priceType: "hourly" })}
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
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-black/50 dark:text-white/50">Ξ</span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.001"
                          value={formData.priceAmount}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow numbers and decimal point
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setFormData({ ...formData, priceAmount: value });
                            }
                          }}
                          onKeyDown={(e) => {
                            // Prevent 'e', 'E', '+', '-' which are valid in number inputs but we don't want
                            if (['e', 'E', '+', '-'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          placeholder="0.5"
                          className="w-full glass-search pl-10 pr-4 py-3 rounded-xl text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
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
                        onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                        placeholder="e.g., 7 days, 2 weeks, Flexible"
                        className="w-full glass-search pl-10 pr-4 py-3 rounded-xl text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
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
                        className="w-full glass-search px-4 py-3 rounded-xl text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
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

                  {/* Background Image Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-black dark:text-white mb-3">
                      Background Image
                    </label>
                    <div className="space-y-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="flex gap-3">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 glass-macos glass-macos-hover px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-black dark:text-white font-semibold"
                        >
                          <Upload className="w-5 h-5" />
                          Upload Background Image
                        </motion.button>
                        {formData.backgroundImage && (
                          <motion.button
                            type="button"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setFormData({ ...formData, backgroundImage: null })}
                            className="glass-macos glass-macos-hover px-4 py-3 rounded-xl text-red-600 dark:text-red-400 font-semibold"
                          >
                            <X className="w-5 h-5" />
                          </motion.button>
                        )}
                      </div>
                      {formData.backgroundImage && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="glass-macos rounded-xl p-4 flex items-center gap-3"
                        >
                          <div className="w-24 h-16 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5">
                            <img
                              src={formData.backgroundImage}
                              alt="Background preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-black dark:text-white">
                              Background uploaded
                            </p>
                            <p className="text-xs text-black/60 dark:text-white/60">
                              This will be the card background
                            </p>
                          </div>
                        </motion.div>
                      )}
                      {!formData.backgroundImage && (
                        <p className="text-xs text-black/50 dark:text-white/50">
                          Upload a widescreen image (recommended: 800x450px or larger)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="block text-sm font-semibold text-black dark:text-white mb-3">
                      Preview
                    </label>
                    <div className="glass-macos rounded-2xl p-4">
                      <div className="aspect-video rounded-xl bg-gradient-to-br from-slate-700 via-gray-800 to-zinc-900 flex items-center justify-center mb-3 overflow-hidden relative">
                        {formData.backgroundImage ? (
                          <img
                            src={formData.backgroundImage}
                            alt="Background"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-white/20 text-sm font-medium">No background image</div>
                        )}
                      </div>
                      <h3 className="font-bold text-black dark:text-white text-sm mb-1">
                        {formData.title || "Your service title"}
                      </h3>
                      <p className="text-xs text-black/60 dark:text-white/60">
                        {formData.category || "Category"}
                      </p>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 text-xs font-medium text-black/70 dark:text-white/70">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
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
                    onClick={handleSubmit}
                    disabled={!isFormValid}
                    whileHover={isFormValid ? { scale: 1.02 } : {}}
                    whileTap={isFormValid ? { scale: 0.98 } : {}}
                    className={`px-8 py-2.5 rounded-2xl font-semibold text-sm flex items-center gap-2 transition-all ${
                      isFormValid
                        ? "btn-macos"
                        : "bg-gray-400/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Publish Service
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>

          {/* Confirmation Toast */}
          <AnimatePresence>
            {showConfirmation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={SPRING}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-macos rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-3 min-w-[300px]"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-black dark:text-white text-sm">
                    Service Published!
                  </p>
                  <p className="text-xs text-black/60 dark:text-white/60">
                    Your service is now live
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
