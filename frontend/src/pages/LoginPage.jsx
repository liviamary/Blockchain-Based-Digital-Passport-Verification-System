import React, { useState } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom"; // import navigate
import "./LoginPage.css";
import logoImage from "../assets/images/logo.png";
import illustrationImage from "../assets/images/Blockchain illustration.png";
import bgImage from "../assets/images/login_bg.png";
import AdminContractABI from "../contracts/AdminContract.json";

const LoginPage = () => {
  const [walletAddress, setWalletAddress] = useState(""); // Store connected wallet
  const navigate = useNavigate(); // hook for navigation

  const handleConnectWallet = async () => {
    try {
      // 1️⃣ Detect wallet
      if (!window.ethereum) {
        alert("MetaMask or a similar Ethereum wallet is not installed.");
        return;
      }

      // 2️⃣ Request accounts
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const account = accounts[0];
      setWalletAddress(account);

      // 3️⃣ Check network
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (parseInt(chainId, 16) !== parseInt(import.meta.env.VITE_SEPOLIA_CHAIN_ID)) {
        alert("Please switch to the Sepolia Testnet network.");
        return;
      }

      // 4️⃣ Connect to contract
      const provider = new ethers.BrowserProvider(window.ethereum); // ethers v6
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        import.meta.env.VITE_ADMIN_CONTRACT_ADDRESS,
        AdminContractABI,
        signer
      );

      // 5️⃣ Admin verification
      const adminAddress = await contract.admin();
      if (adminAddress.toLowerCase() !== account.toLowerCase()) {
        alert("This wallet is not authorized as admin.");
        return;
      }

      alert(`Wallet connected: ${account} ✅`);

      // 6️⃣ Redirect to dashboard
      navigate("/dashboard");

    } catch (error) {
      if (error.code === 4001) {
        alert("Connection request rejected by the user.");
      } else {
        console.error("Wallet connection error:", error);
        alert("An error occurred during wallet connection.");
      }
    }
  };

  return (
    <div className="login-page" style={{ backgroundImage: `url(${bgImage})` }}>
      <div className="login-card-container">

        {/* Illustration Section */}
        <div className="illustration-section">
          <img
            src={illustrationImage}
            alt="Blockchain Illustration"
            className="illustration-img"
          />
        </div>

        {/* Form Section */}
        <div className="login-form-section">
          <img src={logoImage} alt="Passport Logo" className="logo-img" />

          <h1 className="login-title">Admin Portal</h1>
          <p className="login-text">
            Manage passport applications securely and efficiently using blockchain technology.
          </p>

          <button
            className="connect-wallet-button"
            onClick={handleConnectWallet}
          >
            Connect Wallet
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
