import React, { useState, useEffect, useCallback } from "react";
import { Alert, FlatList, StyleSheet, View, Text } from "react-native";
import APIs, { authApis, endpoints } from "../../configs/APIs";
import { ActivityIndicator, Searchbar } from "react-native-paper";
import { PostItem } from "../PostItem";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

const Home = () => {
    const [posts, setPosts] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [refreshing, setRefreshing] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [hasMore, setHasMore] = useState(true);
    const [token, setToken] = React.useState(null);
    const navigation = useNavigation()

    React.useEffect(() => {
        const fetchToken = async () => {
            const storedToken = await AsyncStorage.getItem("token");
            setToken(storedToken);
        };

        fetchToken();
    }, []);

    // Hàm load posts
    const loadPosts = useCallback(async () => {
        if (!hasMore) return; // Ngăn tải thêm khi không còn dữ liệu

        setLoading(true);
        try {
            let url = `${endpoints['post']}?page=${page}`;
            if (searchQuery) url += `&q=${searchQuery}`;

            let res = await APIs.get(url);
            setPosts(prev => (page > 1 ? [...prev, ...res.data.results] : res.data.results));

            if (res.data.next === null) 
                setHasMore(false); // Đánh dấu không còn dữ liệu
        } catch (ex) {
            console.error(ex);
        } finally {
            setLoading(false);
        }
    }, [page, searchQuery, hasMore]);

    const handlePostDeletion = (postId) => {
        Alert.alert(
            "Xác nhận xóa", 
            "Bạn có chắc chắn muốn xóa bài viết này?", 
            [
                {
                    text: "Hủy",
                    style: "cancel"
                },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await authApis(token).delete(endpoints['post-detail'](postId));
                            Alert.alert("Bài viết", "Xóa bài viết thành công!.");
                            setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
                        } catch (error) {
                            console.error(error);
                            Alert.alert("Bài viết", "Không thể xóa bài viết. Vui lòng thử lại.");
                        }
                    }
                }
            ]
        );
    };

    const handlePostUpdation = (postId) => {
        navigation.navigate("UpdatePostScreen", { post: posts.find(post => post.id === postId), origin: "HomeScreen" })
    }


    // Gọi API khi thay đổi page hoặc searchQuery
    useEffect(() => {
        let timer = setTimeout(loadPosts, 500);
        return () => clearTimeout(timer);
    }, [page, searchQuery]);

    // Hàm tải lại danh sách bài viết
    const refreshPosts = useCallback(async () => {
        setRefreshing(true);
        setPage(1);
        setHasMore(true);
        try {
            let res = await APIs.get(`${endpoints['post']}?page=1&q=${searchQuery}`);
            setPosts(res.data.results);
        } catch (ex) {
            console.error(ex);
        } finally {
            setRefreshing(false);
        }
    }, [searchQuery]);

    // Hàm thay đổi tìm kiếm
    const onChangeSearch = useCallback((query) => {
        setSearchQuery(query);
        setPage(1);
        setHasMore(true);
    }, []);

    // Load thêm dữ liệu khi cuộn đến cuối
    const loadMore = () => {
        if (hasMore && !loading) 
            setPage(prev => prev + 1);
    };

    return (
        <View>
            <Searchbar
                placeholder="Tìm kiếm bài viết..."
                onChangeText={onChangeSearch}
                value={searchQuery}
                style={styles.searchBar}
            />
            {posts.length === 0 && !loading ? (
                <Text style={styles.noPostsText}>Không có kết quả tìm kiếm nào</Text>
            ) : (
                <FlatList
                    data={posts}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listStyle}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => <PostItem post={item} onPostDeleted={handlePostDeletion} onPostUpdated={handlePostUpdation} />}
                    onEndReached={loadMore}
                    ListFooterComponent={loading && page > 1 ? <ActivityIndicator size="large" /> : null}
                    refreshing={refreshing}
                    onRefresh={refreshPosts}
                />
            )}
        </View>
    );
};

export default Home;

const styles = StyleSheet.create({
    listStyle: {
        paddingBottom: 100,
        
    },
    searchBar: {
        margin: 10,
    },
    noPostsText: {
        textAlign: "center",
        marginTop: 20,
        fontSize: 16,
        color: "gray",
    },
});