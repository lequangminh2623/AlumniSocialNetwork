import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, FlatList, ActivityIndicator, Alert, Image } from "react-native";
import { Text, IconButton, List } from "react-native-paper";
import { authApis, endpoints } from "../../configs/APIs";
import { getValidImageUrl } from "../PostItem";
import styles from "../User/UserStyles";

const Approve = () => {
    const [loading, setLoading] = useState(true);
    const [unverifiedAlumni, setUnverifiedAlumni] = useState([]);
    const [token, setToken] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

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
                const response = await authApis(token).get(endpoints['unverified-alumni'], {
                    params: { page }
                });
                console.info(response.data.results);
                setUnverifiedAlumni(prev => [...prev, ...response.data.results]);
                setHasMore(response.data.next !== null);
            } catch (error) {
                Alert.alert("Duyệt tài khoản", "Không thể tải danh sách cựu sinh viên chưa được duyệt.");
            } finally {
                setLoading(false);
            }
        };

        fetchUnverifiedAlumni();
    }, [token, page]);

    const handleApprove = async (id) => {
        setActionLoading(true);
        try {
            await authApis(token).patch(endpoints['approve-alumni'](id));
            setUnverifiedAlumni(unverifiedAlumni.filter(alumni => alumni.id !== id));
            Alert.alert("Duyệt tài khoản", "Cựu sinh viên đã được duyệt.");
        } catch (error) {
            console.error(error);
            Alert.alert("Duyệt tài khoản", "Không thể duyệt cựu sinh viên. Vui lòng thử lại.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id) => {
        setActionLoading(true);
        try {
            await authApis(token).delete(endpoints['reject-alumni'](id));
            setUnverifiedAlumni(unverifiedAlumni.filter(alumni => alumni.id !== id));
            Alert.alert("Duyệt tài khoản", "Cựu sinh viên đã bị xóa.");
        } catch (error) {
            console.error(error);
            Alert.alert("Duyệt tài khoản", "Không thể xóa cựu sinh viên. Vui lòng thử lại.");
        } finally {
            setActionLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <List.Item
            title={`${item.user.last_name} ${item.user.first_name}`}
            description={`Email: ${item.user.email}\nMã sinh viên: ${item.student_code}`}
            left={props => (
                <Image
                    {...props}
                    source={{ uri: getValidImageUrl(item.user.avatar) }}
                    style={{ width: 50, height: 50, borderRadius: 25 }}
                />
            )}
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

    const loadMore = () => {
        if (hasMore && !loading) {
            setPage(prevPage => prevPage + 1);
        }
    };

    if (loading && page === 1) {
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
                onEndReached={loadMore}
                ListFooterComponent={hasMore && <ActivityIndicator size="large" color="#0000ff" />}
            />
        </View>
    );
};

export default Approve;