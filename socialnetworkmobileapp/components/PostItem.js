import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { hp } from "../styles/common";
import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { getPostComments, getPostReacts } from "../configs/APIs";
import { theme } from "../styles/theme";

export const getValidImageUrl = (url) => {
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
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear();

    return `${hours}:${minutes} - ${day}/${month}/${year}`;
};

export const PostItem = ({ post }) => {
    const cleanAvatarUrlAvatar = post.user.avatar.replace(/^image\/upload\//, "");
    const liked = false;
    const navigation = useNavigation();

    const [commentCount, setCommentCount] = useState(0);
    const [reactCount, setReactCount] = useState(0);

    useEffect(() => {
        const fetchComments = async () => {
            const comments = await getPostComments(post.id);
            setCommentCount(comments.length);

            const reacts = await getPostReacts(post.id);
            setReactCount(reacts.length);
        };

        fetchComments();
    }, [post.id]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.userInfo}>
                <Image source={{ uri: cleanAvatarUrlAvatar }} style={styles.avatar} />
                <View>
                    <Text style={styles.username}>{post.user.username}</Text>
                    <Text style={styles.postTime}>{formatDate(post.created_date)}</Text>
                </View>
                <FontAwesome name="ellipsis-h" size={hp(2.4)} color={theme.colors.text} style={styles.moreIcon} onPress={() => navigation.navigate("PostDetail", { post })} />
            </View>

            {/* Nội dung bài viết */}
            <Text style={styles.content}>{post.content}</Text>

            {/* Hình ảnh */}
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

            {/* Thanh tương tác */}
            <View style={styles.interactions}>
                <FontAwesome name="heart" size={18} color={liked ? theme.colors.rose : theme.colors.textLight} />
                <Text style={styles.interactionText}>{reactCount}</Text>
                <FontAwesome name="comment" size={18} color="#888" onPress={() => navigation.navigate("PostDetailScreen", { post })} />
                <Text style={styles.interactionText}>{commentCount}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    interactionText: {
        marginLeft: 4,
        marginRight: 15,
        fontSize: 14,
        color: "#555",
    },
    imagesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 10,
    },
    interactions: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
        paddingVertical: 5,
        borderTopWidth: 1,
        borderColor: "#eee",
    },
    postImage: {
        width: "48%",
        height: 200,
        borderRadius: 10,
        marginBottom: 10,
    },
    moreIcon: {
        marginLeft: "auto",
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    content: {
        gap: 10,
    },
    postTime: {
        fontSize: hp(1.4),
        color: theme.colors.textLight,
        fontWeight: theme.fonts.medium,
    },
    username: {
        fontSize: hp(1.7),
        color: theme.colors.textDark,
        fontWeight: theme.fonts.medium,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    container: {
        gap: 10,
        marginBottom: 10,
        marginTop: 10,
        borderRadius: theme.radius.xxl * 1.1,
        borderCurve: 'continuous',
        padding: 10,
        paddingVertical: 12,
        marginHorizontal: 10,
        backgroundColor: 'white',
        borderWidth: 0.5,
        borderColor: theme.colors.gray,
        shadowColor: '#000',
    }
})