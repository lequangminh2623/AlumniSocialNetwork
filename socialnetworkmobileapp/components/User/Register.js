import React, { useState } from "react";
import { Image, Pressable, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, Alert, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import * as ImagePicker from 'expo-image-picker';
import APIs, { endpoints } from "../../configs/APIs";
import { useNavigation } from "@react-navigation/native";
import styles from "./UserStyles";

const Register = () => {
    const [alumni, setAlumni] = useState({
        "student_code": "",
        "last_name": "",
        "first_name": "",
        "email": "",
        "username": "",
        "password": "",
        "confirm": ""
    });
    const [loading, setLoading] = useState(false);
    const [avatar, setAvatar] = useState(null);
    const [cover, setCover] = useState(null);
    const [errors, setErrors] = useState({});

    const nav = useNavigation();

    const alumnis = {
        "student_code": {
            "title": "Mã sinh viên",
            "field": "student_code",
            "secure": false,
            "icon": "card-account-details"
        },
        "last_name": {
            "title": "Họ",
            "field": "last_name",
            "secure": false,
            "icon": "text"
        },
        "first_name": {
            "title": "Tên",
            "field": "first_name",
            "secure": false,
            "icon": "text"
        },
        "email": {
            "title": "Email",
            "field": "email",
            "secure": false,
            "icon": "email"
        },
        "username": {
            "title": "Tên đăng nhập",
            "field": "username",
            "secure": false,
            "icon": "account-circle"
        },
        "password": {
            "title": "Mật khẩu",
            "field": "password",
            "secure": true,
            "icon": "lock"
        },
        "confirm": {
            "title": "Xác nhận mật khẩu",
            "field": "confirm",
            "secure": true,
            "icon": "lock-check"
        }
    };

    const updateAlumni = (value, field) => {
        setAlumni({ ...alumni, [field]: value });
        setErrors({ ...errors, [field]: false });
    };

    const pickAvatar = async () => {
        let { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permissions denied!");
        } else {
            const result = await ImagePicker.launchImageLibraryAsync();
            if (!result.canceled) setAvatar(result.assets[0]);
        }
    };

    const pickCover = async () => {
        let { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permissions denied!");
        } else {
            const result = await ImagePicker.launchImageLibraryAsync();
            if (!result.canceled) setCover(result.assets[0]);
        }
    };

    const validateFields = () => {
        const newErrors = {};
        let isValid = true;
        for (let key in alumni) {
            if (!alumni[key]) {
                newErrors[key] = true;
                isValid = false;
            }
        }
        if (!avatar) {
            newErrors.avatar = true;
            isValid = false;
        }
        setErrors(newErrors);
        return isValid;
    };

    const register = async () => {
        if (!validateFields()) {
            Alert.alert("Đăng ký", "Vui lòng điền đầy đủ thông tin.");
            return;
        }

        setLoading(true);
        try {
            const form = new FormData();
            for (let key in alumni) {
                if (key !== 'confirm') {
                    form.append(`user.${key}`, alumni[key]);
                }
            }
            form.append('student_code', alumni['student_code']);

            if (avatar) {
                form.append('user.avatar', {
                    uri: avatar.uri,
                    name: avatar.fileName || 'avatar.jpg',
                    type: 'image/jpeg'
                });
            }
            if (cover) {
                form.append('user.cover', {
                    uri: cover.uri,
                    name: cover.fileName || 'cover.jpg',
                    type: 'image/jpeg'
                });
            }


            await APIs.post(endpoints['alumni'], form, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Clear input fields and show success message
            setAlumni({
                "student_code": "",
                "last_name": "",
                "first_name": "",
                "email": "",
                "username": "",
                "password": "",
                "confirm": ""
            });
            setAvatar(null);
            setCover(null);
            Alert.alert("Đăng ký thành công", "Đang chờ xét duyệt");

            nav.navigate("LoginScreen");
        } catch (error) {
            // Handle error
            if (error.response) {
                // Server responded with a status other than 200 range
                console.error('Server Error:', error.response.data);
                Alert.alert('Đăng ký', error.response.data.message || 'Thông tin đăng ký không hợp lệ.');
            } else if (error.request) {
                // Request was made but no response was received
                console.error('Network Error:', error.request);
                Alert.alert('Đăng ký', 'Máy chủ quá tải, vui lòng thử lại sau.');
            } else {
                // Something else happened while setting up the request
                console.error('Error:', error.message);
                Alert.alert('Đăng ký', error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.select({ ios: 60, android: 0 })}
            style={styles.container}
        >
            <View style={styles.view}>
                <Text style={styles.title}>Hãy bắt đầu</Text>
                <Text style={styles.title}>Bằng cách tạo một tài khoản!</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollView}>
                {Object.values(alumnis).map(u => (
                    <View key={u.field} style={styles.inputContainer}>
                        <TextInput
                            left={<TextInput.Icon icon={u.icon} />}
                            secureTextEntry={u.secure}
                            style={styles.input}
                            placeholder={u.title}
                            value={alumni[u.field]}
                            onChangeText={t => updateAlumni(t, u.field)}
                            mode="outlined"
                            label={u.title}
                            outlineColor={errors[u.field] ? 'red' : undefined}
                            theme={{ roundness: 20 }} // Adjusted for more rounded corners
                        />
                    </View>
                ))}

                <TouchableOpacity onPress={pickAvatar} style={[styles.imagePicker]}>
                    <Text style={[styles.imagePickerText, errors.avatar && styles.imagePickerTextError]}><TextInput.Icon icon="upload" size={35} color={errors.avatar ? 'red' : '#38559a'} /> Chọn ảnh đại diện</Text>
                </TouchableOpacity>
                {avatar ? <Image source={{ uri: avatar.uri }} style={styles.image} /> : null}

                <TouchableOpacity onPress={pickCover} style={styles.imagePicker}>
                    <Text style={styles.imagePickerText}><TextInput.Icon icon="upload" size={35} color='#38559a' /> Chọn ảnh bìa</Text>
                </TouchableOpacity>
                {cover ? <Image source={{ uri: cover.uri }} style={styles.image} /> : null}

                <Button
                    onPress={register}
                    loading={loading}
                    style={styles.button}
                    icon="account-check"
                    mode="contained"
                >
                    Đăng ký
                </Button>
                <View style={styles.switch}>
                    <Text style={styles.switchText}>Đã có tài khoản?</Text>
                    <Pressable onPress={() => nav.navigate("LoginScreen")}>
                        <Text style={[styles.switchText, { color: '#38559a', fontWeight: 'bold' }]}> Đăng nhập</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default Register;