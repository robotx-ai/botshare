import { create } from "zustand";

interface ForgotPasswordModalState {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const useForgotPasswordModal = create<ForgotPasswordModalState>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));

export default useForgotPasswordModal;
