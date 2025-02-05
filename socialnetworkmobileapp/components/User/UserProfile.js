import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useContext } from "react";
import { TouchableOpacity, View, Image } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { MyDispatchContext, MyUserContext } from "../../configs/UserContexts";
import { getValidImageUrl } from "../PostItem";
import styles from "./UserStyles";
import Styles from "../../styles/Styles";

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
        <View style={styles.cardContainer}>
            <View style={styles.profileCard}>
                <Image
                    source={{ uri: getValidImageUrl(user.avatar) }}
                    style={styles.avatar}
                />
                <View style={styles.textContainer}>
                    {user.first_name || user.last_name ? (
                        <Text style={styles.username}>{user.first_name} {user.last_name}</Text>
                    ) : (<Text style={styles.username}>Quản Trị Viên</Text>)}
                    <Text style={styles.username}>{user?.username}</Text>
                    <Text style={styles.email}> {user?.email}</Text>
                </View>
            </View>
            <TouchableOpacity onPress={() => nav.navigate("ChangePasswordScreen")} style={Styles.menuItem}>
                <Text style={Styles.menuText} >Đổi mật khẩu</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={Styles.menuItem}>
                <Text style={Styles.menuText} >Đăng xuất</Text>
            </TouchableOpacity>
        </View>
    );
};

export default UserProfile;