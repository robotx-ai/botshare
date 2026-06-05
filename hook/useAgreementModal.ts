import { create } from "zustand";

export interface AgreementBookingContext {
  listingId: string;
  listingTitle: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  tierId: string;
  robotCount: number;
}

interface AgreementModalStore {
  isOpen: boolean;
  booking: AgreementBookingContext | null;
  onOpen: (booking: AgreementBookingContext) => void;
  onClose: () => void;
}

const useAgreementModal = create<AgreementModalStore>((set) => ({
  isOpen: false,
  booking: null,
  onOpen: (booking) => set({ isOpen: true, booking }),
  onClose: () => set({ isOpen: false, booking: null }),
}));

export default useAgreementModal;
