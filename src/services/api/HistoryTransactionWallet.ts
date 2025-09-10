import axiosClient from "@/utils/axiosClient";

export const getTransactionHistory = async () => {
    try {
        const response = await axiosClient.get(`/deposit-withdraw/history`);
        return response.data;
    } catch (error) {
        console.error("Error fetching transaction history:", error);
        return [];
    }
}

export const createTransaction = async ({type, amount, wallet_address_to, google_auth_token}: {type: string, amount: number, wallet_address_to: string, google_auth_token?: string}) => {
    try {
        const requestBody = {
            type,
            amount,
            wallet_address_to,
            ...(google_auth_token && { google_auth_token })
        };
        const response = await axiosClient.post(`/deposit-withdraw`, requestBody);
        return response.data;
    } catch (error) {
        console.error("Error creating transaction:", error);
        throw error;
    }
}

// New function for multi-token withdraw
export const createMultiTokenTransaction = async ({
    wallet_address_to,
    amount,
    type,
    token_symbol,
    token_mint_address,
    google_auth_token
}: {
    wallet_address_to: string;
    amount: number;
    type: "withdraw";
    token_symbol: string;
    token_mint_address?: string;
    google_auth_token?: string;
}) => {
    try {
        const requestBody = {
            wallet_address_to,
            amount,
            type,
            token_symbol,
            ...(token_mint_address && { token_mint_address }),
            ...(google_auth_token && { google_auth_token })
        };
        const response = await axiosClient.post(`/deposit-withdraw/multi-token`, requestBody);
        return response.data;
    } catch (error) {
        console.error("Error creating multi-token transaction:", error);
        throw error;
    }
}