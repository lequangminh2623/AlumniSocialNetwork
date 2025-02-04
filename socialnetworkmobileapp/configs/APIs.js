import axios from "axios";

const BASE_URL = 'http://10.0.2.2:8000/';

export const endpoints = {
    'post': '/post/',
    'post-detail': postId => `/post/${postId}/`,
    'login': '/o/token/',
    'current-user': '/user/current/',
    'alumni': '/alumni/',
    'change-password': '/user/change-password/',
    'unverified-alumni': '/alumni/unverified/',
    'approve-alumni': alumniId => `/alumni/${alumniId}/approve/`,
    'reject-alumni': alumniId => `/alumni/${alumniId}/reject/`,
    'comments': (postId) => `/post/${postId}/comments/`,
    'reacts': (postId) => `/post/${postId}/reacts/`,
    'teacher': '/teacher/',
    'expired-teacher': 'teacher/expired/',
    'reset-teacher': teacherId => `/teacher/${teacherId}/reset/`,
    'react': (postId) => `/post/${postId}/react/`,
    'survey': '/survey/',
    'survey-detail': surveyId => `/survey/${surveyId}/`,
    'draft': surveyId => `/survey/${surveyId}/draft/`,
    'submit': surveyId => `/survey/${surveyId}/submit/`,
    'resume': surveyId => `/survey/${surveyId}/resume/`,
    'group': '/group/',
    'invitation': '/invitation/',
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

export const getSurveyData = async (surveyId) => {
    try {
        const res = await axios.get(BASE_URL + endpoints["survey-detail"](surveyId));
        return res.data;
    } catch (error) {
        console.error("Error fetching reacts:", error);
        return [];
    }
};

export const getGroups = async () => {
    try {
        const res = await axios.get(BASE_URL + endpoints.group);
        return res.data;
    } catch (error) {
        console.error("Error fetching groups:", error);
        return [];
    }
};

export const authApis = (token) => {
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