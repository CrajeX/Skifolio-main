// src/App.js
import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import UserTypeSelection from './components/UserTypeSelection';
import Auth from './components/Auth';
import ApplicantProfile from './components/ApplicantProfile';
import EmployerProfile from './components/EmployerProfile';
import JobSearch from './components/JobSearch';
import EmployerJobPost from './components/EmployerJobPost';
import Navbar from './components/Navbar';
import HomeFeed from './components/HomeFeed';
import SignIn from './components/SignIn';
import Portfolio from './components/Portfolio';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AdminPage from './components/AdminPage';

const App = () => {
    const [userType, setUserType] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = () => {
        auth.signOut().then(() => {
            setUser(null);
            setUserType(null);
        }).catch((error) => {
            console.error("Error signing out:", error);
        });
    };

    return (
        <Router>
            {user && <Navbar userType={userType} onLogout={handleLogout} />}
            <Routes>
                <Route path="/" element={<UserTypeSelection setUserType={setUserType} />} /> {/* Entry point */}
                <Route path="/signin" element={<SignIn userType={userType} />} />
                <Route path="/signup" element={<Auth userType={userType} setUser={setUser} />} />
                <Route path="/applicant/profile" element={<ApplicantProfile />} />
                <Route path="/applicant/search-jobs" element={<JobSearch />} />
                <Route path="/employer/profile" element={<EmployerProfile />} />
                <Route path="/employer/post-job" element={<EmployerJobPost />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/home" element={<HomeFeed />} />
                <Route path="/admin" element={<AdminPage />} />
            </Routes>
        </Router>
    );
};

export default App;
