// src/components/Home.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';  // Use useNavigate from react-router-dom v6

const Home = ({ setUserType }) => {
    const [roleSelected, setRoleSelected] = useState(false);
    const navigate = useNavigate();  // Initialize useNavigate hook

    const handleSelectRole = (role) => {
        setUserType(role);
        setRoleSelected(true); // Set role as selected
    };

    const handleChangeRole = () => {
        setUserType(null); // Reset user type
        setRoleSelected(false); // Reset role selection
    };

    const handleAdmit = () => {
        navigate("/admin"); // Route to AdminPage when Admit button is clicked
    };

    return (
        <div className='hero'>
            <div className='Home'>
                <div className='choicecontainer'>
                    <h1>Ski-Folio</h1>
                    <p>A website for our young and new frontend web developers</p>
                    {!roleSelected ? (
                        <><div className='Roles'>
                            <button onClick={() => handleSelectRole('applicant')}>
                                <span>I am an Applicant</span>
                            </button>
                            <button onClick={() => handleSelectRole('employer')}>
                                <span>I am an Employer</span>
                            </button>
                        </div>
                        <button id="admin" className="input submit" onClick={handleAdmit}>Admit</button> {/* Admit button routes to AdminPage */}
                        <div></div></>
                    ) : (
                        <div className='Home1'>
                            <Link to="/signin">
                                <button className="input submit">Sign In</button>
                            </Link>
                            <Link to="/signup">
                                <button className="input submit">Sign Up</button>
                            </Link>
                            <button className="input submit" onClick={handleChangeRole}>Change Role</button>
                           
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Home;
