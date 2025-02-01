import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, FlatList, ActivityIndicator, Alert } from "react-native";
import { Text, IconButton, List } from "react-native-paper";
import { authApis, endpoints } from "../../configs/APIs";
import styles from "../User/UserStyles";

const Approve = () => {
    const [loading, setLoading] = useState(true);
    const [unverifiedAlumni, setUnverifiedAlumni] = useState([]);
    const [token, setToken] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const fetchToken = async () => {
            const storedToken = await AsyncStorage.getItem("token");
            setToken(storedToken);
        };

        fetchToken();
    }, []);

    useEffect(() => {
        const fetchUnverifiedAlumni = async () => {
            if (!token) return;
            try {
                const response = await authApis(token).get(endpoints['unverified-alumni']);
                setUnverifiedAlumni(response.data.results);
                console.info(response.data);
            } catch (error) {
                Alert.alert("Duyệt tài khoản", "Không thể tải danh sách cựu sinh viên chưa được duyệt.");
            } finally {
                setLoading(false);
            }
        };

        fetchUnverifiedAlumni();
    }, [token]);

    const handleApprove = async (id) => {
        setActionLoading(true);
        try {
            await authApis(token).patch(endpoints['approve-alumni'](id));
            setUnverifiedAlumni(unverifiedAlumni.filter(alumni => alumni.id !== id));
            Alert.alert("Thành công", "Cựu sinh viên đã được duyệt.");
        } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Không thể duyệt cựu sinh viên. Vui lòng thử lại.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id) => {
        setActionLoading(true);
        try {
            await authApis(token).delete(endpoints['reject-alumni'](id));
            setUnverifiedAlumni(unverifiedAlumni.filter(alumni => alumni.id !== id));
            Alert.alert("Thành công", "Cựu sinh viên đã bị xóa.");
        } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Không thể xóa cựu sinh viên. Vui lòng thử lại.");
        } finally {
            setActionLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <List.Item
            title={`${item.user.last_name} ${item.user.first_name}`}
            description={`Email: ${item.user.email}\nMã sinh viên: ${item.student_code}`}
            left={props => <List.Icon {...props} icon="account" />}
            right={props => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <IconButton
                        icon="check"
                        color="green"
                        size={20}
                        onPress={() => handleApprove(item.id)}
                        disabled={actionLoading}
                    />
                    <IconButton
                        icon="delete"
                        color="red"
                        size={20}
                        onPress={() => handleDelete(item.id)}
                        disabled={actionLoading}
                    />
                </View>
            )}
        />
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {actionLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#0000ff" />
                </View>
            )}
            <FlatList
                data={unverifiedAlumni}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                ListEmptyComponent={<Text>Không có cựu sinh viên chưa được duyệt.</Text>}
            />
        </View>
    );
};

export default Approve;