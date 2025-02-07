import React, { useState } from "react";
import { Image, Pressable, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, Alert, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import * as ImagePicker from 'expo-image-picker';
import { authApis, endpoints } from "../../configs/APIs";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import styles from "../User/UserStyles";

const CreateAccount = () => {
    const [teacher, setTeacher] = useState({
        "last_name": "",
        "first_name": "",
        "email": "",
        "username": "",
    });
    const [loading, setLoading] = useState(false);
    const [avatar, setAvatar] = useState(null);
    const [cover, setCover] = useState(null);
    const [errors, setErrors] = useState({});

    const nav = useNavigation();

    const teachers = {
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
    };

    const updateteacher = (value, field) => {
        setTeacher({ ...teacher, [field]: value });
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
        for (let key in teacher) {
            if (!teacher[key]) {
                newErrors[key] = true;
                isValid = false;
            }
        }
        setErrors(newErrors);
        return isValid;
    };

    const register = async () => {
        if (!validateFields()) {
            Alert.alert("Tạo tài khoản", "Vui lòng điền đầy đủ thông tin.");
            return;
        }

        setLoading(true);
        try {
            const form = new FormData();
            for (let key in teacher) {
                form.append(`user.${key}`, teacher[key]);
            }

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

            
            const token = await AsyncStorage.getItem("token");
            await authApis(token).post(endpoints['teacher'], form, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Clear input fields and show success message
            setTeacher({
                "last_name": "",
                "first_name": "",
                "email": "",
                "username": "",
            });
            setAvatar(null);
            setCover(null);
            Alert.alert("Tạo tài khoản", "Tạo tài khoản giáo viên thành công");

        } catch (error) {
            // Handle error
            if (error.response) {
                // Server responded with a status other than 200 range
                console.error('Server Error:', error.response.data);
                Alert.alert('Tạo tài khoản', error.response.data.message || 'Thông tin Tạo tài khoản không hợp lệ.');
            } else if (error.request) {
                // Request was made but no response was received
                console.error('Network Error:', error.request);
                Alert.alert('Tạo tài khoản', 'Máy chủ quá tải, vui lòng thử lại sau.');
            } else {
                // Something else happened while setting up the request
                console.error('Error:', error.message);
                Alert.alert('Tạo tài khoản', error.message);
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
                <Text style={styles.title}>Điền thông tin</Text>
                <Text style={styles.title}>Để tạo tài khoản giáo viên:</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollView}>
                {Object.values(teachers).map(u => (
                    <View key={u.field} style={styles.inputContainer}>
                        <TextInput
                            left={<TextInput.Icon icon={u.icon} />}
                            secureTextEntry={u.secure}
                            style={styles.input}
                            placeholder={u.title}
                            value={teacher[u.field]}
                            onChangeText={t => updateteacher(t, u.field)}
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
                    disabled={loading}
                >
                    Tạo tài khoản
                </Button>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default CreateAccount;