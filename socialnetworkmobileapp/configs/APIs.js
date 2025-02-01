import axios from "axios";

const BASE_URL = 'http://10.0.2.2:8000/';

export const endpoints = {
    'post': '/post/',
    'login': '/o/token/',
    'current-user': '/user/current/',
    'alumni': '/alumni/',
    'change-password': '/user/change-password/',
    'unverified-alumni': '/alumni/unverified/',
    'approve-alumni': alumniId => `/alumni/${alumniId}/approve/`,
    'reject-alumni': alumniId => `/alumni/${alumniId}/reject/`,
    'post': '/post/',
    'comments': (postId) => `/post/${postId}/comments/`,
    'reacts': (postId) => `/post/${postId}/reacts/`,
}

export const getPostComments = async (postId) => {
    try {
        const res = await axios.get(BASE_URL + endpoints.comments(postId));
        return res.data;
    } catch (error) {
        console.error("Error fetching comments:", error);
        return [];
    }
};

export const getPostReacts = async (postId) => {
    try {
        const res = await axios.get(BASE_URL + endpoints.reacts(postId));
        return res.data;
    } catch (error) {
        console.error("Error fetching reacts:", error);
        return [];
    }
};

export const authApis = (token) =>  {
    console.info(token);
    return axios.create({
        baseURL: BASE_URL, 
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
}


export default axios.create({
    baseURL: BASE_URL
})