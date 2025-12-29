import { ethers } from "ethers";
import AdminContractABI from "../contracts/AdminContract.json";

// Read contract address from .env
const CONTRACT_ADDRESS = import.meta.env.VITE_ADMIN_CONTRACT_ADDRESS;

export const getContract = async () => {
  if (!window.ethereum) throw new Error("MetaMask not found");

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, AdminContractABI.abi, signer);

  return contract;
};
