import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useContext } from "react";
import { View } from "react-native";
import { Button, Text } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { MyDispatchContext, MyUserContext } from "../../configs/UserContexts";
import styles from "./UserStyles";

const UserProfile = () => {
    const user = useContext(MyUserContext);
    const dispatch = useContext(MyDispatchContext);
    const nav = useNavigation();

    const logout = async () => {
        await AsyncStorage.removeItem("token");
        dispatch({
            "type": "logout"
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.view}>
                <Text style={styles.title}>Chào {user?.username}</Text>
                <Text style={styles.info}>Email: {user?.email}</Text>
                <Text style={styles.info}>Họ và tên: {user?.last_name} {user?.first_name}</Text>
            </View>
            <Button mode="contained-tonal" onPress={() => nav.navigate("change-password")} style={styles.button}>
                Đổi mật khẩu
            </Button>
            <Button mode="contained-tonal" onPress={logout} style={styles.button}>
                Đăng xuất
            </Button>
        </View>
    );
};

export default UserProfile;