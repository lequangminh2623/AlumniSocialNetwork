import React from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import APIs, { authApis, endpoints } from "../../configs/APIs";
import { ActivityIndicator, Searchbar } from "react-native-paper";
import { PostItem } from "../PostItem";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Home = () => {
    const [posts, setPosts] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [refreshing, setRefreshing] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [filteredPosts, setFilteredPosts] = React.useState([]);
    const [token, setToken] = React.useState(null);

    React.useEffect(() => {
        const fetchToken = async () => {
            const storedToken = await AsyncStorage.getItem("token");
            setToken(storedToken);
        };

        fetchToken();
    }, []);

    // Hàm load posts
    const loadPosts = async () => {
        if (page > 0) {
            setLoading(true);
            try {
                let url = `${endpoints['post']}?page=${page}`;
                let res = await APIs.get(url);
                console.info(res.data);

                if (page > 1) {
                    setPosts((posts) => [...posts, ...res.data.results]);
                } else {
                    setPosts(res.data.results);
                }

                if (res.data.next === null) {
                    setPage(0); // Không còn dữ liệu nữa
                }
            } catch (ex) {
                console.error(ex);
            } finally {
                setLoading(false);
            }
        }
        else 
            return
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

    // Hàm để tải lại bài viết
    const refreshPosts = async () => {
        setRefreshing(true);
        setPage(1); // Reset lại trang về 1
        try {
            let res = await APIs.get(`${endpoints['post']}?page=1`);
            setPosts(res.data.results);
            setPage(2);
        } catch (ex) {
            console.error(ex);
        } finally {
            setRefreshing(false);
        }
    };

    // Gọi loadPosts mỗi khi page thay đổi
    React.useEffect(() => {
        loadPosts();
    }, [page]);

    // Gọi filterPosts mỗi khi searchQuery hoặc posts thay đổi
    React.useEffect(() => {
        filterPosts();
    }, [searchQuery, posts]);

    const loadMore = () => {
        if (page > 0 && !loading) {
            setPage(page + 1); // Khi tới cuối danh sách, load thêm bài viết
        }
    };

    const onChangeSearch = (query) => {
        setSearchQuery(query);
    };

    const filterPosts = () => {
        if (searchQuery) {
            const filtered = posts.filter(post => post.content.toLowerCase().includes(searchQuery.toLowerCase()));
            setFilteredPosts(filtered);
        } else {
            setFilteredPosts(posts);
        }
    };

    if (loading && page === 1) {
        return <ActivityIndicator size="large" />;
    }

    return (
        <View>
            <Searchbar
                placeholder="Search"
                onChangeText={onChangeSearch}
                value={searchQuery}
                style={styles.searchBar}
            />
            <FlatList
                data={filteredPosts}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listStyle}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => <PostItem post={item} onPostDeleted={handlePostDeletion} />}
                onEndReached={loadMore}
                ListFooterComponent={loading && page > 1 ? <ActivityIndicator size="large" /> : null}
                refreshing={refreshing}
                onRefresh={refreshPosts}
            />
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
});
