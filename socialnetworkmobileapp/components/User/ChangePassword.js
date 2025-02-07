import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import { View, Text, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { endpoints, authApis } from "../../configs/APIs";
import styles from "./UserStyles";

const ChangePassword = () => {
    const [passwords, setPasswords] = useState({
        current_password: "",
        new_password: "",
        confirm: ""
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const users = {
        "current_password": {
            "title": "Mật khẩu hiện tại",
            "field": "current_password",
            "secure": true,
            "icon": "eye"
        },  
        "new_password": {
            "title": "Mật khẩu mới",
            "field": "new_password",
            "secure": true,
            "icon": "lock"
        },  
        "confirm": {
            "title": "Xác nhận mật khẩu mới",
            "field": "confirm",
            "secure": true,
            "icon": "lock-check"
        }
    };

    const updatePassword = (value, field) => {
        setPasswords({ ...passwords, [field]: value });
        setErrors({ ...errors, [field]: false });
    };

    const validateFields = () => {
        const newErrors = {};
        let isValid = true;
        if (!passwords.current_password) {
            newErrors.current_password = true;
            isValid = false;
        }
        if (!passwords.new_password) {
            newErrors.new_password = true;
            isValid = false;
        }
        if (!passwords.confirm) {
            newErrors.confirm = true;
            isValid = false;
        }
        setErrors(newErrors);
        return isValid;
    };

    const changePassword = async () => {
        if (!validateFields()) {
            Alert.alert("Đổi mật khẩu", "Vui lòng điền đầy đủ thông tin.");
            return;
        }
        if (passwords.new_password !== passwords.confirm) {
            Alert.alert("Đổi mật khẩu", "Mật khẩu và xác nhận không trùng khớp!");
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("token");
            await authApis(token).patch(endpoints['change-password'], {
                current_password: passwords.current_password,
                new_password: passwords.new_password
            });

            Alert.alert("Đổi mật khẩu", "Mật khẩu đã được thay đổi.");
            setPasswords({
                current_password: "",
                new_password: "",
                confirm: ""
            });
        } catch (error) {
            Alert.alert("Đổi mật khẩu", "Không thể thay đổi mật khẩu. Vui lòng thử lại.");
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
                <Text style={styles.title}>Để tiếp tục,</Text>
                <Text style={styles.title}>Hãy nhập thông tin sau</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollView}>
                {Object.values(users).map(u => (
                    <TextInput
                        key={u.field}
                        label={u.title}
                        value={passwords[u.field]}
                        onChangeText={t => updatePassword(t, u.field)}
                        secureTextEntry={u.secure}
                        style={styles.input}
                        left={<TextInput.Icon icon={u.icon} />}
                        mode="outlined"
                        outlineColor={errors[u.field] ? 'red' : undefined}
                        theme={{ roundness: 20 }}
                    />
                ))}
                <Button mode="contained-tonal" onPress={changePassword} loading={loading} disabled={loading} style={styles.button}>
                    Đổi mật khẩu
                </Button>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default ChangePassword;