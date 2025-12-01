// frontend/src/utils/toast.js
import { toast } from "react-toastify";

export const notifySuccess = (msg) => toast.success(msg, { autoClose: 1500 });
export const notifyInfo = (msg) => toast.info(msg, { autoClose: 1500 });
export const notifyError = (msg) => toast.error(msg, { autoClose: 2000 });
