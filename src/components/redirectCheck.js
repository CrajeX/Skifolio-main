import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase'; // Adjust the import path based on your project structure
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const redirectCheck = async (user, setUser) => {
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            alert('You are not signed in.');
            navigate('/signin');
            return;
        }

        const checkUserStatus = async () => {
            try {
                const employerDoc = await getDoc(doc(db, 'employers', user.uid));
                const applicantDoc = await getDoc(doc(db, 'applicants', user.uid));

                if (employerDoc.exists()) {
                    setUser(user); // Update user state
                    navigate('/employer/profile'); // Redirect employer
                } else if (applicantDoc.exists()) {
                    setUser(user); // Update user state
                    navigate('/applicant/profile'); // Redirect applicant
                } else {
                    alert('Please wait for your account to be verified first.');
                }
            } catch (error) {
                console.error('Error checking user status:', error);
                alert('An error occurred while verifying your account. Please try again later.');
            }
        };

        // Perform the check
        checkUserStatus();

        // Optionally, you could set an interval to recheck status if desired
        // const interval = setInterval(checkUserStatus, 30000); // Recheck every 30 seconds
        // return () => clearInterval(interval);
    }, [user, navigate, setUser]);
};

export default redirectCheck;
