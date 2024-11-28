import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

const AdminPage = () => {
  const [employers, setEmployers] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedUserType, setSelectedUserType] = useState("Applicants");
  const [selectedUser, setSelectedUser] = useState(null);
  const [employerJobs, setEmployerJobs] = useState([]);
  const [jobApplicants, setJobApplicants] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState(null);

  // Fetch Applicants
  useEffect(() => {
    const fetchApplicants = async () => {
      try {
        const applicantsSnapshot = await getDocs(collection(db, "applicants"));
        const applicantsData = await Promise.all(
          applicantsSnapshot.docs.map(async (doc) => {
            const userId = doc.id;
            const applicantData = doc.data();

            // Fetch submissions
            const submissionsRef = collection(db, "applicants", userId, "submissions");
            const submissionsSnapshot = await getDocs(submissionsRef);
            const submissions = submissionsSnapshot.docs.map((subDoc) => subDoc.data());

            // Fetch applied jobs
            const appliedJobsRef = collection(db, "applicants", userId, "appliedJobs");
            const appliedJobsSnapshot = await getDocs(appliedJobsRef);
            const appliedJobs = appliedJobsSnapshot.docs.map((jobDoc) => jobDoc.data());

            return {
              ...applicantData,
              userId,
              submissions,
              appliedJobs,
            };
          })
        );
        setApplicants(applicantsData);
      } catch (error) {
        console.error("Error fetching applicants:", error);
      }
    };

    fetchApplicants();
  }, []);

  // Fetch Employers
  useEffect(() => {
    const fetchEmployers = async () => {
      try {
        const employersSnapshot = await getDocs(collection(db, "employers"));
        const employersData = employersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEmployers(employersData);
      } catch (error) {
        console.error("Error fetching employers:", error);
      }
    };

    fetchEmployers();
  }, []);

  // Handle Applicant Click
  const handleUserClick = async (user) => {
    if (selectedUserType === "Applicants") {
      // If the user is an applicant, set the user data with submissions and applied jobs
      setSelectedUser({
        ...user,
        submissions: user.submissions || [],
        appliedJobs: user.appliedJobs || [],
      });
    } else {
      // If the user is an employer, set the employer data and fetch the posted jobs
      setSelectedUser(user);
  
      // Fetch the jobs posted by the employer
      const employerJobsQuery = query(collection(db, "jobs"), where("employerId", "==", user.id));
      const employerJobsSnapshot = await getDocs(employerJobsQuery);
      const jobs = employerJobsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      setEmployerJobs(jobs);  // Update the state with the employer's jobs
      setSelectedJob(null);    // Reset the selected job
      setJobApplicants([]);   // Clear applicants for the selected job
    }
  };
  
  // Handle Employer Click: Fetch jobs posted by employer
  const handleEmployerClick = async (employer) => {
    setSelectedUser(employer);
    const employerJobsQuery = query(collection(db, "jobs"), where("employerId", "==", employer.id));
    const employerJobsSnapshot = await getDocs(employerJobsQuery);
  
    const jobs = employerJobsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    console.log("Fetched Jobs for Employer:", jobs);  // Debugging log
  
    setEmployerJobs(jobs);
  
    if (jobs.length === 0) {
      console.log("No jobs found for this employer.");  // Debugging log if no jobs are found
    }
  
    setSelectedJob(null);
    setJobApplicants([]);
  };
  
  

  // Handle Job Click: Fetch applicants for the selected job
  const handleJobClick = async (jobId) => {
    setSelectedJob(jobId);
    const applicantsRef = collection(db, "jobs", jobId, "applications");
    const applicantsSnapshot = await getDocs(applicantsRef);
    const applicants = applicantsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setJobApplicants(applicants);
  };
  

  // Handle Applicant Click (from employer's job applicants)
  const handleApplicantClick = (applicant) => {
    setSelectedApplicant(applicant);
  };

  // Close Modals
  const handleCloseUserModal = () => {
    setSelectedUser(null);
    setEmployerJobs([]);
    setSelectedJob(null);
    setJobApplicants([]);
  };

  const handleCloseApplicantModal = () => {
    setSelectedApplicant(null);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h2>Admin Page</h2>

      {/* User Type Toggle */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => setSelectedUserType("Applicants")}
          style={{
            marginRight: "10px",
            padding: "10px 15px",
            backgroundColor: selectedUserType === "Applicants" ? "#007bff" : "#ddd",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          View Applicants
        </button>
        <button
          onClick={() => setSelectedUserType("Employers")}
          style={{
            padding: "10px 15px",
            backgroundColor: selectedUserType === "Employers" ? "#007bff" : "#ddd",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          View Employers
        </button>
      </div>

      {/* User Table */}
      <div style={{ border: "1px solid #ddd", borderRadius: "5px", padding: "20px" }}>
        <h3>{selectedUserType}</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>
                {selectedUserType === "Applicants" ? "Name" : "Company Name"}
              </th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Email</th>
              <th style={{ border: "1px solid #ddd", padding: "10px" }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {(selectedUserType === "Applicants" ? applicants : employers).map((user) => (
              <tr key={user.id || user.userId}>
                <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                  {user.name || user.companyName}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "10px" }}>{user.email}</td>
                <td style={{ border: "1px solid #ddd", padding: "10px", textAlign: "center" }}>
                  <button
                    onClick={() => handleUserClick(user)}
                    style={{
                      padding: "5px 10px",
                      backgroundColor: "#007bff",
                      color: "#fff",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detailed Applicant Modal */}
      {selectedUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "5px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80%",
              overflowY: "auto",
            }}
          >
            <h4>{selectedUserType === "Applicants" ? "Applicant Details" : "Employer Details"}</h4>
            {selectedUserType === "Applicants" ? (
              <>
                <p>
                  <strong>Name:</strong> {selectedUser.name}
                </p>
                <p>
                  <strong>Email:</strong> {selectedUser.email}
                </p>
                <p>
                  <strong>Resume:</strong>{" "}
                  <a href={selectedUser.resumeURL} target="_blank" rel="noopener noreferrer">
                    View Resume
                  </a>
                </p>
                <h5>Submissions</h5>
                <ul>
                  {selectedUser.submissions?.map((submission, index) => (
                    <li key={index}>
                      <strong>Live Demo:</strong>{" "}
                      <a href={submission.liveDemoLink} target="_blank" rel="noopener noreferrer">
                        View
                      </a>{" "}
                      | <strong>Demo Video:</strong>{" "}
                      <a href={submission.demoVideoLink} target="_blank" rel="noopener noreferrer">
                        Watch
                      </a>
                    </li>
                  ))}
                </ul>
                <h5>Applied Jobs</h5>
                <ul>
                  {selectedUser.appliedJobs?.map((job, index) => (
                    <li key={index}>
                      <p>
                        <strong>Job Title:</strong> {job.title}
                      </p>
                      <p>
                        <strong>Location:</strong> {job.location}
                      </p>
                      <p>
                        <strong>Applied At:</strong> {job.appliedAt?.toDate().toLocaleString() || "N/A"}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p>
                  <strong>Company Name:</strong> {selectedUser.companyName}
                </p>
                <p>
                  <strong>Email:</strong> {selectedUser.email}
                </p>
                <h5>Posted Jobs</h5>
                <ul>
                  {employerJobs.map((job, index) => (
                    <li key={index}>
                      <p>
                        <strong>Job Title:</strong> {job.title}
                      </p>
                      <p>
                        <strong>Location:</strong> {job.location}
                      </p>
                      <p>
                        <button onClick={() => handleJobClick(job.id)} style={{ cursor: "pointer" }}>
                          View Applicants
                        </button>
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <button
              onClick={handleCloseUserModal}
              style={{
                marginTop: "20px",
                padding: "10px 15px",
                backgroundColor: "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Job Applicants Modal */}
      {selectedJob && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "5px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80%",
              overflowY: "auto",
            }}
          >
            <h4>Job Applicants</h4>
            <ul>
              {jobApplicants.map((applicant, index) => (
                <li key={index}>
                  <p>
                    <strong>Name:</strong> {applicant.name}
                  </p>
                  <p>
                    <button
                      onClick={() => handleApplicantClick(applicant)}
                      style={{
                        padding: "5px 10px",
                        backgroundColor: "#007bff",
                        color: "#fff",
                        border: "none",
                        borderRadius: "3px",
                        cursor: "pointer",
                      }}
                    >
                      View Applicant
                    </button>
                  </p>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setSelectedJob(null)}
              style={{
                marginTop: "20px",
                padding: "10px 15px",
                backgroundColor: "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Applicant Detailed View */}
      {selectedApplicant && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "5px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80%",
              overflowY: "auto",
            }}
          >
            <h4>Applicant Details</h4>
            <p>
              <strong>Name:</strong> {selectedApplicant.name}
            </p>
            <p>
              <strong>Email:</strong> {selectedApplicant.email}
            </p>
            <p>
              <strong>Resume:</strong>{" "}
              <a href={selectedApplicant.resumeURL} target="_blank" rel="noopener noreferrer">
                View Resume
              </a>
            </p>
            <button
              onClick={handleCloseApplicantModal}
              style={{
                marginTop: "20px",
                padding: "10px 15px",
                backgroundColor: "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
