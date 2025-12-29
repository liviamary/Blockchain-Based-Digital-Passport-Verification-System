// src/pages/VerifyPassport.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { MdVerified, MdError, MdCloudSync, MdArrowBack } from "react-icons/md";
import contractABI from "../contracts/AdminContract.json";
import "./VerifyPassport.css";

const VerifyPassport = () => {
  const { passportID } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Verifying"); // Verifying, Verified, Failed
  const [details, setDetails] = useState(null);

  useEffect(() => {
    const verify = async () => {
      try {
        if (!window.ethereum) {
          setStatus("Failed");
          setLoading(false);
          return;
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(
          import.meta.env.VITE_ADMIN_CONTRACT_ADDRESS,
          contractABI,
          provider
        );

        const app = await contract.getApplication(passportID);

        // Check Blockchain status
        if (app[2].toString().trim() !== "Approved") {
          setStatus("Failed");
          setLoading(false);
          return;
        }

        // Fetch Backend details
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/passport/verify/${passportID}`
        );

        if (!res.ok) {
          setStatus("Failed");
        } else {
          const data = await res.json();
          setDetails(data);
          setStatus("Verified");
        }
      } catch (err) {
        console.error(err);
        setStatus("Failed");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [passportID]);

  return (
    <div className="verify-page-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <MdArrowBack /> Back
      </button>

      <div className={`verification-card ${status.toLowerCase()}`}>
        <div className="card-header">
          {status === "Verifying" && <MdCloudSync className="status-icon spin" />}
          {status === "Verified" && <MdVerified className="status-icon success" />}
          {status === "Failed" && <MdError className="status-icon danger" />}
          
          <h1>{status === "Verifying" ? "Authenticating..." : `Passport ${status}`}</h1>
          <p className="passport-id-tag">Document ID: {passportID}</p>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="skeleton-loader">
              <div className="shimmer line"></div>
              <div className="shimmer line"></div>
              <div className="shimmer line"></div>
            </div>
          ) : details ? (
            <div className="details-grid">
              <div className="detail-item">
                <label>Full Name</label>
                <p>{details.name || details.holder_name}</p>
              </div>
              <div className="detail-item">
                <label>Nationality</label>
                <p>{details.nationality}</p>
              </div>
              <div className="detail-item">
                <label>Issuance Date</label>
                <p>{details.issuedOn || "N/A"}</p>
              </div>
              <div className="detail-item">
                <label>Blockchain Status</label>
                <span className="status-badge">Immutable & Verified</span>
              </div>
            </div>
          ) : (
            <div className="error-message">
              <p>The passport ID provided could not be verified on the blockchain. This document may be invalid or pending approval.</p>
            </div>
          )}
        </div>

        <div className="card-footer">
          <p>Verified via Blockchain Technology</p>
          <div className="security-seal">OFFICIAL</div>
        </div>
      </div>
    </div>
  );
};

export default VerifyPassport;