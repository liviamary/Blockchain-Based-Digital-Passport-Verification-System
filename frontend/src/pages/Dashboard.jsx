// src/pages/Dashboard.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  MdNotificationsNone,
  MdOutlineSettings,
  MdDashboard,
  MdOutlineVerifiedUser,
  MdCancel,
  MdClose,
  MdSearch,
} from "react-icons/md";
import { FiUsers } from "react-icons/fi";
import logo from "../assets/images/logo.png";
import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import contractABI from "../contracts/AdminContract.json";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

/* ---------------- Small Helpers ---------------- */
function prettyErrorMessage(err) {
  if (!err) return null;
  if (typeof err === "string") return err;
  if (err.message) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/* ---------------- Applications Table ---------------- */
const ApplicationsTable = React.memo(function ApplicationsTable({
  applications,
  loading,
  selectedView,
  onSelectApplicant,
}) {
  const [localSearch, setLocalSearch] = useState("");

  const filtered = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    return applications.filter((app) => {
      const matchesView =
        selectedView === "Dashboard" || app.status === selectedView;
      const matchesSearch =
        q === "" ? true : app.passportID.toLowerCase().includes(q);
      return matchesView && matchesSearch;
    });
  }, [applications, selectedView, localSearch]);

  return (
    <div className="dashboard-content-area">
      <div className="search-filter-row">
        <div className="search-input-wrapper full-width" role="search">
          <MdSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by Passport ID..."
            className="search-input"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      {loading ? (
        <p className="loading-text">Fetching applications from blockchain...</p>
      ) : (
        <table className="styled-table updated-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Application ID</th>
              <th>Date</th>
              <th>Status</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((app, idx) => (
                <tr key={app.passportID + "-" + idx}>
                  <td>
                    <div className="user-info-cell">
                      <div className="avatar-circle">
                        <img
                          src="https://cdn-icons-png.flaticon.com/512/3177/3177440.png"
                          alt="User"
                        />
                      </div>
                      <div className="user-details">
                        <span className="user-name">{app.userWallet.slice(0, 6)}...{app.userWallet.slice(-4)}</span>
                        <span className="user-wallet">
                          {app.userWallet.slice(0, 6)}...{app.userWallet.slice(-4)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="app-id">{app.passportID}</td>
                  <td>{app.createdAt}</td>
                  <td>
                    <span className={`status-chip ${app.status.toLowerCase()}`}>
                      {app.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      className="view-data-btn"
                      onClick={() => onSelectApplicant(app)}
                    >
                      View Data
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", padding: "40px" }}>
                  No applications found in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
});

/* ---------------- Dashboard Main Component ---------------- */
const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState("Dashboard");
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [decryptedData, setDecryptedData] = useState(null);
  const [decryptLoading, setDecryptLoading] = useState(false);
  const [decryptError, setDecryptError] = useState(null);

  const hasFetchedRef = useRef(false);

  // Load applications from Blockchain
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        if (!window.ethereum) return;
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(
          import.meta.env.VITE_ADMIN_CONTRACT_ADDRESS,
          contractABI,
          signer
        );

        const logs = await contract.queryFilter(contract.filters.ApplicationRegistered());
        const fetchedApps = [];
        for (const log of logs) {
          const app = await contract.getApplication(log.args.passportID);
          fetchedApps.push({
            passportID: app[0],
            userWallet: app[1],
            status: app[2],
            qrURL: app[3],
            ipfsHash: app[4],
            createdAt: new Date(Number(app[5]) * 1000).toLocaleDateString(),
          });
        }
        setApplications(fetchedApps.reverse());
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  // Fetch Decrypted Data
  const fetchDecryptedFromBackend = async (app) => {
    setDecryptLoading(true);
    setDecryptError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/passport/admin/${encodeURIComponent(app.passportID)}`);
      const body = await res.json();
      const data = body.decrypted_passport || body.decrypted || body;
      setDecryptedData(data);
    } catch (err) {
      setDecryptError("Failed to decrypt data from server.");
    } finally {
      setDecryptLoading(false);
    }
  };

 const handleReject = async (passportID) => {
  if (!window.confirm("Are you sure you want to reject this application?")) return;

  try {
    setIsProcessing(true);

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(
      import.meta.env.VITE_ADMIN_CONTRACT_ADDRESS,
      contractABI,
      signer
    );

    const tx = await contract.rejectApplication(passportID);
    await tx.wait();

    alert("Application rejected successfully!");
    window.location.reload();
  } catch (err) {
    alert("Reject failed: " + prettyErrorMessage(err));
  } finally {
    setIsProcessing(false);
  }
};

const handleApprove = async (passportID) => {
  if (!window.confirm("Approve and verify this application?")) return;

  try {
    setIsProcessing(true);

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(
      import.meta.env.VITE_ADMIN_CONTRACT_ADDRESS,
      contractABI,
      signer
    );

    // Temporary QR URL (can be replaced later)
    const qrURL = `http://localhost:5173/verify/${passportID}`;


    const tx = await contract.approveApplication(passportID, qrURL);
    await tx.wait();

    alert("Application approved successfully!");
    window.location.reload();
  } catch (err) {
    alert("Approval failed: " + prettyErrorMessage(err));
  } finally {
    setIsProcessing(false);
  }
};


  const ApplicantModal = ({ applicant, onClose }) => {
    useEffect(() => {
      if (!applicant || hasFetchedRef.current) return;
      hasFetchedRef.current = true;
      fetchDecryptedFromBackend(applicant);
    }, [applicant]);

    if (!applicant) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content professional-modal">
          <div className="modal-header">
            <div className="header-text">
              <h3>Applicant Details</h3>
              <span className="subtitle">ID: {applicant.passportID}</span>
            </div>
            <MdClose className="close-icon" onClick={onClose} />
          </div>

          <div className="modal-body modal-scrollable">
            <div className="detail-section highlight-bg">
              <div className="info-grid">
                <div className="info-item">
                  <label>Current Status</label>
                  <span className={`status-chip ${applicant.status.toLowerCase()}`}>{applicant.status}</span>
                </div>
                <div className="info-item">
                  <label>Wallet Address</label>
                  <span className="mono-text">{applicant.userWallet}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>Personal Information</h4>
              {decryptLoading ? (
                <div className="loading-shimmer">Decrypting secure data...</div>
              ) : decryptError ? (
                <div className="error-box">{decryptError}</div>
              ) : decryptedData ? (
                <div className="info-grid secondary">
                  {Object.entries(decryptedData).map(([k, v]) => (
                    k !== 'files' && (
                      <div key={k} className="info-item">
                        <label>{k.toUpperCase().replace(/_/g, ' ')}</label>
                        <p>{typeof v === "object" ? JSON.stringify(v) : String(v)}</p>
                      </div>
                    )
                  ))}
                </div>
              ) : <p>No data retrieved.</p>}
            </div>

            {decryptedData?.files && (
              <div className="detail-section">
                <h4>Uploaded Documents</h4>
                <div className="file-grid">
                  {Object.entries(decryptedData.files).map(([name, b64]) => (
                    <div key={name} className="file-card">
                      <span className="file-name">{name}</span>
                      <a href={b64.startsWith('data:') ? b64 : `data:application/pdf;base64,${b64}`} 
                         download={`${applicant.passportID}_${name}`} 
                         className="file-download-link">Download</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer-actions">
            <button
  className="reject-btn-large"
  onClick={() => handleReject(applicant.passportID)}
  disabled={isProcessing || applicant.status !== "Pending"}
>
  Reject Application
</button>

            <button
  className="approve-btn-large"
  onClick={() => handleApprove(applicant.passportID)}
  disabled={isProcessing || applicant.status !== "Pending"}
>
  Approve & Verify
</button>

          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-portal-layout">
      <div className="sidebar">
        <div className="logo-section">
          <img src={logo} alt="Logo" className="logo-img" />
        </div>
        <nav className="sidebar-nav">
          {[{ name: "Dashboard", icon: <MdDashboard /> },
            { name: "Pending", icon: <FiUsers /> },
            { name: "Approved", icon: <MdOutlineVerifiedUser /> },
            { name: "Rejected", icon: <MdCancel /> }
          ].map((item) => (
            <div key={item.name} className={`nav-item ${selectedView === item.name ? "active-sidebar" : ""}`}
                 onClick={() => setSelectedView(item.name)}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>
            </div>
          ))}
        </nav>
      </div>

      <div className="main-content-wrapper">
        <header className="top-header">
          <div className="header-title">Passport Admin Portal</div>
          <div className="header-icons">
            <MdNotificationsNone className="header-icon" />
            <MdOutlineSettings className="header-icon" />
            <div className="profile-avatar">
              <img src="https://cdn-icons-png.flaticon.com/512/3177/3177440.png" alt="Profile" />
              <div className="logout-btn" onClick={() => navigate("/")}>Logout</div>
            </div>
          </div>
        </header>

        <div className="status-cards-row">
          <div className="status-card card-applicants">
            <div className="card-count">{applications.length}</div>
            <div className="card-title">Total Applicants</div>
          </div>
          <div className="status-card card-pending">
            <div className="card-count">{applications.filter(a => a.status === "Pending").length}</div>
            <div className="card-title">Pending</div>
          </div>
          <div className="status-card card-approved">
            <div className="card-count">{applications.filter(a => a.status === "Approved").length}</div>
            <div className="card-title">Approved</div>
          </div>
          <div className="status-card card-rejected">
            <div className="card-count">{applications.filter(a => a.status === "Rejected").length}</div>
            <div className="card-title">Rejected</div>
          </div>
        </div>

        <div className="dashboard-content-container">
          <ApplicationsTable
            applications={applications}
            loading={loading}
            selectedView={selectedView}
            onSelectApplicant={(app) => {
              hasFetchedRef.current = false;
              setSelectedApplicant(app);
            }}
          />
        </div>
      </div>

      {selectedApplicant && (
        <ApplicantModal
          applicant={selectedApplicant}
          onClose={() => {
            setSelectedApplicant(null);
            setDecryptedData(null);
            hasFetchedRef.current = false;
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;