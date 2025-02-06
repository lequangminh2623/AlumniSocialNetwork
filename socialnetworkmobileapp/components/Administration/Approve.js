import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, FlatList, ActivityIndicator, Alert, Image, StyleSheet } from "react-native";
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
        <View style={styles1.listItem}>
          <Image
            source={{ uri: getValidImageUrl(item.user.avatar) }}
            style={styles1.avatar}
          />
          <View style={styles1.textContainer}>
            <Text style={styles1.title}>{`${item.user.last_name} ${item.user.first_name}`}</Text>
            <Text style={styles1.description}>{`Email: ${item.user.email}\nMã sinh viên: ${item.student_code}`}</Text>
          </View>
          <View style={styles1.actionButtons}>
            <IconButton
              icon="check"
              color="green"
              size={20}
              onPress={() => handleApprove(item.id)}
              disabled={actionLoading}
              style={styles.iconButton}
            />
            <IconButton
              icon="delete"
              color="red"
              size={20}
              onPress={() => handleDelete(item.id)}
              disabled={actionLoading}
              style={styles1.iconButton}
            />
          </View>
        </View>
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
        <View style={[styles.container, {backgroundColor:'f9f9f9'}]}>
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

const styles1 = StyleSheet.create({
    listItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        margin: 10,
        backgroundColor: '#fff',
        borderRadius: 20,
        elevation: 2,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 35,
      marginRight: 16,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '500',
      color: '#333',
      marginBottom: 4,
    },
    description: {
      fontSize: 14,
      color: '#666',
    },
    actionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconButton: {
      marginHorizontal: 4,
    },
  });

export default Approve;