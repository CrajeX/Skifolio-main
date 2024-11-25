// // src/components/Navbar.js
// import React from 'react';
// import { Link } from 'react-router-dom';
// import { auth } from '../firebase';

// const Navbar = () => {
//     const handleLogout = async () => {
//         await auth.signOut();
//     };

//     return (
//         <nav>
//             <Link to="/">Home</Link>
//             <Link to="/job-board">Job Board</Link>
//             <Link to="/profile">Applicant Profile</Link>
//             <Link to="/employer-profile">Employer Profile</Link>
//             <button onClick={handleLogout}>Logout</button>
//         </nav>
//     );
// };

// export default Navbar;
// src/components/Navbar.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles.css"; // Custom CSS file for aesthetics

const Navbar = ({ userType, onLogout }) => {
  const [isMobile, setIsMobile] = useState(false); // Tracks if the viewport is mobile
  const [isNavOpen, setIsNavOpen] = useState(false); // Tracks menu state (mobile only)

  useEffect(() => {
    // Update isMobile based on window size
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 992); // Bootstrap lg breakpoint
    };

    handleResize(); // Set initial state
    window.addEventListener("resize", handleResize); // Listen for window resizing

    return () => window.removeEventListener("resize", handleResize); // Cleanup
  }, []);

  const toggleNav = () => setIsNavOpen(!isNavOpen);

  return (
    <nav className="navbar navbar-expand-lg fixed-top custom-navbar">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          Ski-Folio
        </Link>

        {/* Hamburger Icon (Mobile Only) */}
        {isMobile && (
          <button
            className={`navbar-toggler ${isNavOpen ? "open" : ""}`}
            type="button"
            onClick={toggleNav}
          >
            <div className="burger-icon">
              <span className="line"></span>
              <span className="line"></span>
              <span className="line"></span>
            </div>
          </button>
        )}

        {/* Navbar Links */}
        <div
          className={`navbar-collapse ${isMobile ? (isNavOpen ? "show" : "hide") : ""}`}
        >
          <ul className="navbar-nav ms-auto">
            {userType === "applicant" && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/applicant/profile">
                    Profile
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/applicant/search-jobs">
                    Search Jobs
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/portfolio">
                    Portfolio
                  </Link>
                </li>
              </>
            )}
            {userType === "employer" && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/employer/profile">
                    Profile
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/employer/post-job">
                    Post Job
                  </Link>
                </li>
              </>
            )}
            <li className="nav-item">
              <Link className="nav-link" to="/" onClick={onLogout}>
                Logout
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
