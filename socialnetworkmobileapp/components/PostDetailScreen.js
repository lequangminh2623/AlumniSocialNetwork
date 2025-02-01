import React, { useEffect, useState } from "react";
import { View, Text, Image, FlatList, StyleSheet } from "react-native";
import { getPostComments } from "../configs/APIs";

const getValidImageUrl = (url) => {
    if (url.startsWith("image/upload/")) {
        return url.replace(/^image\/upload\//, "");
    }
    return url;
};

const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";

    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    return `${hours}:${minutes} - ${day}/${month}/${year}`;
};

const PostDetailScreen = ({ route }) => {
    const { post } = route.params;
    const [comments, setComments] = useState([]);
    const cleanAvatarUrlAvatar = post.user.avatar.replace(/^image\/upload\//, "");

    const [commentsCount, setCommentsCount] = useState(0);

    useEffect(() => {
        const fetchComments = async () => {
            const data = await getPostComments(post.id);
            setComments(data);
            setCommentsCount(data.length);
        };

        fetchComments();
    }, [post.id]);
    return (
        <View style={styles.container}>
            <View style={styles.post}>
                <Image source={{ uri: cleanAvatarUrlAvatar }} style={styles.avatar} />
                <View>
                    <Text style={styles.username}>{post.user.username}</Text>
                    <Text style={styles.postTime}>{formatDate(post.created_date)}</Text>
                </View>
            </View>
            <Text style={styles.content}>{post.content}</Text>

            {post.images && post.images.length > 0 && (
                <View style={styles.imagesContainer}>
                    {post.images.map((image, index) => (
                        <Image
                            key={index}
                            source={{ uri: getValidImageUrl(image.image) }}
                            style={styles.postImage}
                        />
                    ))}
                </View>
            )}
            <Text style={styles.commentTitle}>Bình luận</Text>
            <FlatList
                data={comments}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.comment}>
                        <Image source={{ uri: cleanAvatarUrlAvatar }} style={styles.commentAvatar} />
                        <View>
                            <Text style={styles.commentUser}>{item.user.username}</Text>
                            <Text style={styles.commentText}>{item.content}</Text>
                        </View>
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { 
        padding: 16, 
        backgroundColor: "#fff", 
        flex: 1 
    },
    post: { 
        flexDirection: "row", 
        alignItems: "center", 
        marginBottom: 10 
    },
    avatar: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        marginRight: 10 
    },
    username: { 
        fontSize: 16, 
        fontWeight: "bold" 
    },
    postTime: { 
        fontSize: 12, 
        color: "#888" 
    },
    content: { 
        fontSize: 14, 
        marginBottom: 10 
    },
    postImage: { 
        width: "100%", 
        height: 200, 
        borderRadius: 10 
    },
    commentTitle: { 
        fontSize: 18, 
        fontWeight: "bold", 
        marginTop: 20 
    },
    comment: { 
        flexDirection: "row", 
        alignItems: "center", 
        marginTop: 10 
    },
    commentAvatar: { 
        width: 30, 
        height: 30, 
        borderRadius: 15, 
        marginRight: 10 
    },
    commentUser: { 
        fontWeight: "bold" 
    },
    commentText: { 
        fontSize: 14 
    },
    imagesContainer: {
        flexDirection: "column",
        gap: 10, 
        marginTop: 10, 
    },
    postImage: {
        width: "100%",
        height: 200,
        borderRadius: 10,
        marginBottom: 10,
    },
});

export default PostDetailScreen;