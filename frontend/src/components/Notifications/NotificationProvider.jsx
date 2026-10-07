import { createContext, useContext, useState } from "react";
import {
    CheckCircle,
    XCircle,
    AlertCircle,
    Info,
    X
} from "lucide-react";

import "./NotificationProvider.css";

const NotificationContext = createContext(null);

export const useNotification = () => {
    const context = useContext(NotificationContext);

    if (!context) {
        throw new Error(
            "useNotification must be used within NotificationProvider"
        );
    }

    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const removeNotification = (id) => {
        setNotifications((prev) =>
            prev.filter((notification) => notification.id !== id)
        );
    };

    const showNotification = ({
        type = "info",
        message,
        duration = 4000
    }) => {
        const id =
            Date.now() +
            Math.random();

        setNotifications((prev) => [
            ...prev,
            {
                id,
                type,
                message
            }
        ]);

        if (duration > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }

        return id;
    };

    const success = (message, duration = 4000) =>
        showNotification({
            type: "success",
            message,
            duration
        });

    const error = (message, duration = 4000) =>
        showNotification({
            type: "error",
            message,
            duration
        });

    const warning = (message, duration = 4000) =>
        showNotification({
            type: "warning",
            message,
            duration
        });

    const info = (message, duration = 4000) =>
        showNotification({
            type: "info",
            message,
            duration
        });

    return (
        <NotificationContext.Provider
            value={{
                showNotification,
                success,
                error,
                warning,
                info,
                removeNotification
            }}
        >
            {children}

            <div className="notifications-container">
                {notifications.map((notification) => (
                    <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClose={() =>
                            removeNotification(notification.id)
                        }
                    />
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

const NotificationItem = ({
    notification,
    onClose
}) => {
    const icons = {
        success: <CheckCircle size={20} />,
        error: <XCircle size={20} />,
        warning: <AlertCircle size={20} />,
        info: <Info size={20} />
    };

    return (
        <div
            className={`notification notification-${notification.type}`}
        >
            <div className="notification-icon">
                {icons[notification.type]}
            </div>

            <div className="notification-content">
                <span className="notification-message">
                    {notification.message}
                </span>
            </div>

            <button
                type="button"
                className="notification-close"
                onClick={onClose}
                aria-label="Cerrar notificación"
            >
                <X size={16} />
            </button>
        </div>
    );
};

export default NotificationProvider;