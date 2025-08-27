import axiosClient from "@/utils/axiosClient";


export const getListMembers = async ()=>{
    try {
        const temp = await axiosClient.get("/referent/get-list-members")
        return temp.data;
    } catch (error) {
        console.log(error)
        return {};
    }
}

export const getRewards = async ()=>{
    try {
        const temp = await axiosClient.get("/referent/rewards")
        return temp.data;
    } catch (error) {
        console.log(error)
        return {};
    }
}

// New API functions for referral withdrawal
export const createReferralWithdraw = async () => {
    try {
        const response = await axiosClient.post("/referent/withdraw");
        return response.data;
    } catch (error) {
        console.error("Error creating referral withdrawal:", error);
        throw error;
    }
}

export const getReferralWithdrawHistory = async () => {
    try {
        const response = await axiosClient.get("/referent/withdraw-history");
        return response.data;
    } catch (error) {
        console.error("Error fetching referral withdrawal history:", error);
        return { success: false, data: [] };
    }
}

export const getAvailableReferralWithdrawal = async () => {
    try {
        const response = await axiosClient.get("/referent/available-withdrawal");
        return response.data;
    } catch (error) {
        console.error("Error fetching available referral withdrawal:", error);
        return { success: false, data: null };
    }
}