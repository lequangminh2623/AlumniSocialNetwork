import AsyncStorage from "@react-native-async-storage/async-storage";
import { useContext, useState} from "react";
import { KeyboardAvoidingView, Pressable, Platform, ScrollView, Alert, View, Text, } from "react-native";
import { Button, TextInput } from "react-native-paper";
import APIs, { authApis, endpoints } from "../../configs/APIs";
import { MyDispatchContext } from "../../configs/UserContexts";
import { useNavigation } from "@react-navigation/native";
import styles from "./UserStyles";

const Login = () => {
    const [user, setUser] = useState({
        "username": "",
        "password": ""
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const nav = useNavigation();
    const users = {
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
        }
    }
    const dispatch = useContext(MyDispatchContext);

    const updateUser = (value, field) => {
        setUser({ ...user, [field]: value });
        setErrors({ ...errors, [field]: false });
    }

    const validateFields = () => {
        const newErrors = {};
        let isValid = true;
        for (let key in user) {
            if (!user[key]) {
                newErrors[key] = true;
                isValid = false;
            }
        }
        setErrors(newErrors);
        return isValid;
    };

    const login = async () => {
        if (!validateFields()) {
            Alert.alert("Đăng nhập", "Vui lòng điền đầy đủ thông tin.");
            return;
        }

        try {
            setLoading(true);
            const res = await APIs.post(endpoints['login'], {
                "client_id": "MV3NXBPByLWjE1z3PYL0z9m6sICf2X55J1NzB97z",
                "client_secret": "Vyxl2HJWUPUaGXRGi4UR807Ge4Pp5OhDoLHHr2mMz5zk5BlQLQSiGmVvXnsKvmo66izLYbSz3DmOWlcFnRS6UbQlpvqTFxaGTzEHHmv2q08o6BwWvOC8ygJiDY2rRrn4",
                'grant_type': "password",
                ...user
            });
            
            await AsyncStorage.setItem('token', res.data.access_token);

            setTimeout(async () => {
                const token = await AsyncStorage.getItem("token");
                let user = await authApis(token).get(endpoints['current-user']);

                console.info(user.data);
            
                dispatch({ "type": "login", "payload": user.data });

                nav.navigate('HomeStack', { screen: 'HomeScreen' });

            }, 100);
           
        } catch (ex) {
            console.error(ex);
            Alert.alert("Đăng nhập", "Tài khoản hoặc mật khẩu không đúng!.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.view}>
                <Text style={styles.title}>Xin chào,</Text>
                <Text style={styles.title}>Đăng nhập để tiếp tục!</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollView}>
                {Object.values(users).map(u => (
                    <TextInput
                        left={<TextInput.Icon icon={u.icon} />}
                        key={u.field}
                        secureTextEntry={u.secure}
                        style={styles.input}
                        placeholder={u.title}
                        value={user[u.field]}
                        onChangeText={t => updateUser(t, u.field)}
                        mode="outlined"
                        label={u.title}
                        outlineColor={errors[u.field] ? 'red' : undefined}
                        theme={{ roundness: 20 }}
                    />
                ))}
            
                <Button
                    onPress={login}
                    loading={loading}
                    style={styles.button}
                    icon="account-check"
                    mode="contained"
                >
                    Đăng nhập
                </Button>

                <View style={styles.switch}>
                    <Text style={styles.switchText}>Chưa có tài khoản?</Text>
                    <Pressable onPress={() => nav.navigate("register")}>
                        <Text style={[styles.switchText, {color: '#38559a', fontWeight: 'bold'}]}> Đăng ký</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

export default Login;