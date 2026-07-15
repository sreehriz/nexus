import React from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import MeetingRoom from "../components/MeetingRoom";
import { useAuth } from "../context/AuthContext";

export default function MeetingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLeave = () => {
    navigate("/dashboard");
  };

  if (!id) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen z-50 bg-[#0B0B0B]">
      <MeetingRoom
        roomCode={id}
        onLeave={handleLeave}
      />
    </div>
  );
}
