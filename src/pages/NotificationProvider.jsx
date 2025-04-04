import React, { createContext, useState, useEffect, useContext } from "react";
import { io } from "socket.io-client";
import { useAuth0 } from "@auth0/auth0-react";
import { toast } from "react-toastify";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth0();

  useEffect(() => {
    if (!user) return;

    const socket = io("http://localhost:4000", {
      query: { userId: user.sub },
    });

    socket.on("newNotification", (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show toast message
      toast.info(notification.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
