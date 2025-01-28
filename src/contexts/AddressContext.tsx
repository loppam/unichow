import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { Address } from "../types/order";

interface AddressContextType {
  currentAddress: Address;
  setCurrentAddress: (address: Address) => void;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

export function AddressProvider({ children }: { children: ReactNode }) {
  const [currentAddress, setCurrentAddress] = useState<Address>(() => {
    const saved = localStorage.getItem("currentAddress");
    return saved
      ? JSON.parse(saved)
      : {
          address: "",
          additionalInstructions: "",
        };
  });

  useEffect(() => {
    localStorage.setItem("currentAddress", JSON.stringify(currentAddress));
  }, [currentAddress]);

  return (
    <AddressContext.Provider value={{ currentAddress, setCurrentAddress }}>
      {children}
    </AddressContext.Provider>
  );
}

export function useAddress() {
  const context = useContext(AddressContext);
  if (context === undefined) {
    throw new Error("useAddress must be used within an AddressProvider");
  }
  return context;
}
