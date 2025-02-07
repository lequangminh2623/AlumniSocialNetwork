import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, FlatList, ActivityIndicator, Alert, RefreshControl, StyleSheet, Image } from "react-native";
import { Text, Checkbox, Button, Searchbar } from "react-native-paper";
import { authApis, endpoints } from "../../configs/APIs";
import { getValidImageUrl } from "../PostItem";

const Approve = () => {
    const [unverifiedAlumni, setUnverifiedAlumni] = useState([]);
    const [selectedAlumni, setSelectedAlumni] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');


    const loadUnverifiedAlumni = async () => {
        if (page > 0) {
            setLoading(true);
            try {
                let url = `${endpoints['unverified-alumni']}?page=${page}`;
                if (searchQuery) url = `${url}&search=${searchQuery}`;
                const token = await AsyncStorage.getItem("token");
                const res = await authApis(token).get(url);
                if (page > 1) {
                    setUnverifiedAlumni((prev) => [...prev, ...res.data.results]);
                } else {
                    setUnverifiedAlumni(res.data.results);
                }
                if (res.data.next === null) setPage(0);
            } catch (error) {
                console.error(error);
                Alert.alert("Lỗi", "Không thể tải danh sách cựu sinh viên chưa được duyệt.");
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        let timer = setTimeout(() => loadUnverifiedAlumni(), 500);
        return () => clearTimeout(timer);
    }, [searchQuery, page]);


    const loadMore = () => {
        if (page > 0 && !loading) {
            setPage(page + 1)
        };
    };

    const search = (value, callback) => {
        setPage(1);
        callback(value);
    };

    const refresh = () => {
        setPage(1);
        loadUnverifiedAlumni();
    };

    const toggleSelectAlumni = (id) => {
        setSelectedAlumni((prevSelected) =>
            prevSelected.includes(id)
                ? prevSelected.filter((alumniId) => alumniId !== id)
                : [...prevSelected, id]
        );
    };

    const selectAll = () => {
        if (selectedAlumni.length === unverifiedAlumni.length) {
            setSelectedAlumni([]);
        } else {
            setSelectedAlumni(unverifiedAlumni.map((alumni) => alumni.id));
        }
    };

    const confirmBulkApprove = () => {
        Alert.alert(
            "Xác nhận",
            `Bạn có chắc chắn muốn duyệt ${selectedAlumni.length} cựu sinh viên đã chọn?`,
            [
                { text: "Hủy", style: "cancel" },
                { text: "Đồng ý", onPress: handleBulkApprove },
            ]
        );
    };

    const handleBulkApprove = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("token");
            await authApis(token).post(endpoints['approve-alumni-bulk'], {
                pks: selectedAlumni,
            });
            setUnverifiedAlumni((prevAlumni) =>
                prevAlumni.filter((alumnus) => !selectedAlumni.includes(alumnus.id))
            );
            setSelectedAlumni([]);
            Alert.alert("Thành công", "Đã duyệt các cựu sinh viên được chọn.");
        } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Không thể duyệt cựu sinh viên. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    const confirmBulkDelete = () => {
        Alert.alert(
            "Xác nhận",
            `Bạn có chắc chắn muốn xóa ${selectedAlumni.length} cựu sinh viên đã chọn?`,
            [
                { text: "Hủy", style: "cancel" },
                { text: "Đồng ý", onPress: handleBulkDelete },
            ]
        );
    };

    const handleBulkDelete = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("token");
            await authApis(token).delete(endpoints['reject-alumni-bulk'], {
                pks: selectedAlumni,
            });
            setUnverifiedAlumni((prevAlumni) =>
                prevAlumni.filter((alumnus) => !selectedAlumni.includes(alumnus.id))
            );
            setSelectedAlumni([]);
            Alert.alert("Thành công", "Đã xóa các cựu sinh viên được chọn.");
        } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Không thể xóa cựu sinh viên. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.listItem}>
            <Checkbox
                status={selectedAlumni.includes(item.id) ? "checked" : "unchecked"}
                onPress={() => toggleSelectAlumni(item.id)}
            />
            <Image
                source={{ uri: getValidImageUrl(item.user.avatar) }}
                style={styles.avatar}
            />
            <View style={styles.textContainer}>
                <Text style={styles.title}>{`${item.user.last_name} ${item.user.first_name}`}</Text>
                <Text style={styles.description}>{`Email: ${item.user.email}\nMã sinh viên: ${item.student_code}`}</Text>
            </View>
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
            <Searchbar
                placeholder="Tìm kiếm cựu sinh viên"
                value={searchQuery}
                onChangeText={t => search(t, setSearchQuery)}
                style = {styles.searchBar}
            />
            <View style={styles.buttonContainer}>
                <Button onPress={selectAll} style={styles.selectAllButton}>
                    {selectedAlumni.length === unverifiedAlumni.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </Button>
                <View style={styles.bulkButtonContainer}>
                    <Button
                        mode="contained"
                        onPress={confirmBulkApprove}
                        disabled={selectedAlumni.length === 0 || loading}
                        style={styles.bulkButton}
                        buttonColor="#4CAF50"
                    >
                        Duyệt
                    </Button>
                    <Button
                        mode="contained"
                        onPress={confirmBulkDelete}
                        disabled={selectedAlumni.length === 0}
                        style={styles.bulkButton}
                        buttonColor="#F44336"
                    >
                        Xóa
                    </Button>
                </View>
            </View>
            {unverifiedAlumni.length === 0 && !loading ? (
                <Text style={styles.emptyText}>Không có kết quả tìm kiếm nào</Text>
            ) : (
                <>
                    <FlatList
                        data={unverifiedAlumni}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id.toString()}
                        refreshControl={
                            <RefreshControl refreshing={loading} onRefresh={refresh} />
                        }
                        onEndReached={loadMore}
                    />
                    {loading && <ActivityIndicator />}

                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    listItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        margin: 10,
        backgroundColor: "#fff",
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
        fontWeight: "500",
        color: "#333",
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: "#666",
    },
    searchBar: {
        margin: 10,
    },
    bulkButton: {
        margin: 5,
    },
    buttonContainer: {
        flexDirection: 'row',
    },
    bulkButtonContainer: {
        marginLeft: "auto",
        flexDirection: 'row',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#666',
        fontSize: 18
      },
});

export default Approve;
