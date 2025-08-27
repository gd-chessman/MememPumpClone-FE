import axiosClient from "@/utils/axiosClient";


export const login = async (code: string, refCode?: string) => {
    try {
        const temp = await axiosClient.post(`/login-email`, { code, refCode: refCode || null });
        return temp.data;
    } catch (e) {
        console.log(e)
        throw e;
    }
}