import React, { useState, useEffect, useCallback } from "react";
import { Alert, FlatList, StyleSheet, View, Text, RefreshControl } from "react-native";
import APIs, { authApis, endpoints } from "../../configs/APIs";
import { ActivityIndicator, Searchbar } from "react-native-paper";
import { PostItem } from "../PostItem";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

const Home = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [token, setToken] = useState(null);
    const navigation = useNavigation();

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const storedToken = await AsyncStorage.getItem("token");
                setToken(storedToken);
            } catch (error) {
                console.error("Failed to fetch token:", error);
            }
        };
        fetchToken();
    }, []);

    const loadPosts = async () => {
        if (page > 0) {
            setLoading(true);
            try {
                let url = `${endpoints['post']}?page=${page}`;
                if (q)
                    url = `${url}&q=${q}`;
                let res = await APIs.get(url);
                setPosts(page > 1 ? [...posts, ...res.data.results] : res.data.results);
                if (res.data.next === null)
                    setPage(0);
            } catch (ex) {
                console.error(ex);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        let timer = setTimeout(() => loadPosts(), 500);
        return () => clearTimeout(timer);
    }, [q, page]);

    const loadMore = () => {
        if (page > 0 && !loading)
            setPage(page + 1);
    };

    const search = (value, callback) => {
        setPage(1);
        callback(value);
    };

    const refresh = () => {
        setPage(1);
        loadPosts();
    };

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

    return (
        <View>
            <Searchbar
                placeholder="Tìm kiếm bài viết..."
                onChangeText={t => search(t, setQ)}
                value={q}
                style={styles.searchBar}
            />
            {posts.length === 0 && !loading ? (
                <Text style={styles.noPostsText}>Không có kết quả tìm kiếm nào</Text>
            ) : (
                <>
                    <FlatList
                        data={posts}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listStyle}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => <PostItem post={item} onPostDeleted={handlePostDeletion} onPostUpdated={handlePostUpdation} />}
                        onEndReached={loadMore}
                        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
                    />
                    {loading && <ActivityIndicator />}

                </>
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