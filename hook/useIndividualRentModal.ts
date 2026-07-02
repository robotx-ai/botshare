import { create } from "zustand";

interface IndividualRentModalStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const useIndividualRentModal = create<IndividualRentModalStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));

export default useIndividualRentModal;
