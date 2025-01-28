import axios from "axios";

const BASE_URL = 'http://10.0.2.2:8000/';

export const endpoints = {
    'alumnis': '/alumni/',
    'login': '/o/token/',
}

export const authApis =  (token) =>  {
    console.info("TEST")
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