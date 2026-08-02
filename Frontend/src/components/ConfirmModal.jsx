import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react"

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Delete Permanently",
  cancelText = "Cancel",
  loading = false,
  variant = "danger"
}) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1012]/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-[#16171B] border border-[#272930] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative space-y-6 text-center"
        >
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-[#0F1012] border border-[#272930] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* ICON HEADER */}
          <div className="flex justify-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xl ${
              variant === "danger" 
                ? "bg-red-500/10 border-red-500/20 text-red-400" 
                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}>
              {variant === "danger" ? <Trash2 className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
            </div>
          </div>

          {/* TEXT CONTENT */}
          <div className="space-y-2">
            <h3 className="font-serif text-2xl text-white font-medium">{title}</h3>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-sans">
              {description}
            </p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-full bg-[#0F1012] border border-[#272930] hover:border-zinc-500 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className={`flex-1 py-3 px-4 rounded-full text-white text-xs font-bold transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 ${
                variant === "danger"
                  ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-900/30"
                  : "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-900/30"
              } disabled:opacity-50`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
