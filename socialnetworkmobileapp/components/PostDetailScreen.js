import React, { useContext, useEffect, useRef, useState } from "react";
import { View, Text, Image, FlatList, StyleSheet, TouchableOpacity, TextInput, Button, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { getPostComments, authApis, endpoints } from "../configs/APIs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import 'moment/locale/vi';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { IconButton } from "react-native-paper";
import { MyUserContext } from "../configs/UserContexts";
import { useNavigation } from "@react-navigation/native";

moment.locale("vi");

const getValidImageUrl = (url) => {
    if (url.startsWith("image/upload/")) {
        return url.replace(/^image\/upload\//, "");
    }
    return url;
};

const selectImage = async (setImage) => {
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
    }
};

const MAX_REPLY_DEPTH = 3;

const PostDetailScreen = ({ route }) => {
    const { post, onCommentAdded } = route.params;
    const [comments, setComments] = useState([]);
    const commentContentRef = useRef("");
    const [inputKey, setInputKey] = useState(0);
    const replyContentRef = useRef("");
    const [replyingTo, setReplyingTo] = useState(null);
    const [commentImage, setCommentImage] = useState(null);
    const [replyImage, setReplyImage] = useState(null);
    const user = useContext(MyUserContext);
    const [token, setToken] = useState(null);
    const navigation = useNavigation()
    const cleanAvatarUrlAvatar = post.user.avatar.replace(/^image\/upload\//, "");
    const [commentsLocked, setCommentsLocked] = useState(post.lock_comment);

    const buildCommentTree = (comments) => {
        if (!Array.isArray(comments)) return [];
        let commentMap = new Map();
        let rootComments = [];

        comments.forEach(comment => {
            comment.replies = [];
            commentMap.set(comment.id, comment);
        });

        comments.forEach(comment => {
            if (comment.parent) {
                commentMap.get(comment.parent)?.replies.push(comment);
            } else {
                rootComments.push(comment);
            }
        });

        return rootComments;
    };



    const handleCommentEdit = async (commentId, newContent, newImage) => {
        try {
            const content = newContent.trim();
            if (!content) return;
            const api = authApis(token);

            const formData = new FormData();
            formData.append('content', content);
            if (newImage) {
                formData.append('image', {
                    uri: newImage,
                    type: 'image/jpeg',
                    name: 'comment-image.jpg',
                });
            }

            await api.put(`/comment/${commentId}/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const data = await getPostComments(post.id);
            setComments(buildCommentTree(data));
            if (onCommentAdded) {
                onCommentAdded(data.length);
            }
        } catch (error) {
            console.error("Error editing comment:", error);
        }
    };

    const handleToggleCommentsLock = async () => {
        try {
            const api = authApis(token);
            await api.put(`/post/${post.id}/lock-unlock-comment/`);
            setCommentsLocked(!commentsLocked);
            navigation.navigate('HomeStack', { screen: 'HomeScreen' });
        } catch (error) {
            console.error("Error toggling comments lock:", error);
        }
    };

    const CommentItem = ({ comment, onReply, depth = 0 }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editContent, setEditContent] = useState(comment.content);
        const [editImage, setEditImage] = useState(comment.image);
        
        

        return (
            <View style={[styles.comment]}>
                <Image source={{ uri: cleanAvatarUrlAvatar }} style={styles.commentAvatar} />
                <View>
                    <View style={styles.commentContainer}>
                        <View style={styles.commentHeader}>
                            {comment.user.first_name || comment.user.last_name ? (
                                <Text style={styles.commentUser}>{comment.user.first_name} {comment.user.last_name}</Text>
                            ) : (<Text style={styles.commentUser}>Quản Trị Viên</Text>)}
                            {(user.role === 0 || user.id === post.user.id || user.id === comment.user.id) && (
                                <IconButton
                                    icon="delete"
                                    color="red"
                                    size={18}
                                    onPress={() => handleCommentDelete(comment.id)}
                                />
                            )}
                            {(user.id === comment.user.id) && (
                                <IconButton
                                    icon="lead-pencil"
                                    color="red"
                                    size={18}
                                    onPress={() => setIsEditing(true)}
                                />
                            )}
                        </View>

                        {isEditing ? (
                            <View>
                                <TextInput
                                    style={styles.commentInput}
                                    value={editContent}
                                    onChangeText={setEditContent}
                                    placeholder="Chỉnh sửa bình luận..."
                                    multiline
                                />
                                <View style={styles.replyActions}>
                                    <TouchableOpacity onPress={() => selectImage(setEditImage)}>
                                        <Ionicons name="image-outline" size={20} color="blue" />
                                    </TouchableOpacity>
                                    <IconButton
                                        icon="check"
                                        iconColor="#007BFF"
                                        size={30}
                                        onPress={() => {
                                            handleCommentEdit(comment.id, editContent, editImage);
                                            setIsEditing(false);
                                        }}
                                    />
                                    <IconButton
                                        icon="close"
                                        iconColor="red"
                                        size={30}
                                        onPress={() => setIsEditing(false)}
                                    />
                                </View>
                                {editImage && (
                                    <View style={styles.selectedImageContainer}>
                                        <Image source={{ uri: getValidImageUrl(editImage) }} style={styles.selectedImage} />
                                        <TouchableOpacity onPress={() => setEditImage(null)}>
                                            <Ionicons name="close-circle" size={24} color="red" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', width: '100%' }}>
                                <Text style={styles.commentText}>{comment.content}</Text>
                            </View>
                        )}
                        {comment.image && !isEditing && (
                            <Image source={{ uri: getValidImageUrl(comment.image) }} style={styles.commentImage} />
                        )}
                    </View>

                    <View style={styles.deleteAndEditContainer}>
                    {!commentsLocked && (
                        <View>
                        {depth < MAX_REPLY_DEPTH && (
                            <TouchableOpacity onPress={() => changeReplyingTo(comment.id)}>
                                <Text style={styles.replyButton}>Trả lời</Text>
                            </TouchableOpacity>
                        )}
                        </View>
                    )}
                        <Text style={styles.commentTime}>{moment(comment.created_date).fromNow()}</Text>
                    </View>

                    {replyingTo === comment.id && (
                        <View>
                            <View style={styles.replyContainer}>
                                <TextInput
                                    style={styles.replyInput}
                                    defaultValue={replyContentRef.current}
                                    onChangeText={(text) => (replyContentRef.current = text)}
                                    placeholder="Viết bình luận..."
                                    multiline
                                />
                                <View style={styles.replyActions}>
                                    <TouchableOpacity onPress={() => selectImage(setReplyImage)}>
                                        <Ionicons name="image-outline" size={20} color="blue" />
                                    </TouchableOpacity>
                                    <IconButton icon="send" iconColor="#007BFF" size={30} onPress={() => handleReply(comment.id)} />
                                </View>
                            </View>
                            {replyImage && (
                                <View style={styles.selectedImageContainer}>
                                    <Image source={{ uri: replyImage }} style={styles.selectedImage} />
                                    <TouchableOpacity onPress={() => setReplyImage(null)}>
                                        <Ionicons name="close-circle" size={24} color="red" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
                    {comment.replies?.length > 0 && (
                        <View style={styles.repliesContainer}>
                            {comment.replies.map(reply => (
                                <CommentItem key={reply.id} comment={reply} onReply={onReply} depth={depth + 1} />
                            ))}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    useEffect(() => {
        const fetchToken = async () => {
            const storedToken = await AsyncStorage.getItem("token");
            setToken(storedToken);
        };

        fetchToken();
    }, []);

    useEffect(() => {
        const fetchComments = async () => {
            const data = await getPostComments(post.id);
            setComments(buildCommentTree(data));
        };

        fetchComments();
    }, [post.id]);


    const changeReplyingTo = (commentId) => {
        replyContentRef.current = ""
        setReplyingTo(commentId)
    }

    const handleComment = async () => {
        try {
            const content = commentContentRef.current.trim();
            commentContentRef.current = "";
            if (!content) return;
            const api = authApis(token);

            const formData = new FormData();
            formData.append('content', content);
            if (commentImage) {
                formData.append('image', {
                    uri: commentImage,
                    type: 'image/jpeg',
                    name: 'comment-image.jpg',
                });
            }

            await api.post(`/post/${post.id}/comment/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setInputKey((prev) => prev + 1);
            setCommentImage(null);
            const data = await getPostComments(post.id);
            setComments(buildCommentTree(data));
            if (onCommentAdded) {
                onCommentAdded(data.length);
            }
        } catch (error) {
            console.error("Error commenting on post:", error);
        }
    };

    const handleCommentDelete = async (commentId) => {
        Alert.alert(
            "Xác nhận xóa",
            "Bạn có chắc chắn muốn xóa bình luận này?",
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
                            const response = await authApis(token).delete(endpoints['comment-detail'](commentId));
                            const data = await getPostComments(post.id);
                            setComments(buildCommentTree(data));
                            if (onCommentAdded) {
                                onCommentAdded(data.length);
                            }
                            Alert.alert("Bình luận", "Xóa bình luận thành công!");
                        } catch (error) {
                            console.error(error);
                            Alert.alert("Bình luận", "Không thể xóa bình luận. Vui lòng thử lại.");
                        }
                    }
                }
            ]
        )

    };



    const handleReply = async (commentId) => {
        try {
            const content = replyContentRef.current.trim();
            replyContentRef.current = "";
            if (!content) return;
            const api = authApis(token);

            const formData = new FormData();
            formData.append("content", content);
            if (replyImage) {
                formData.append('image', {
                    uri: replyImage,
                    type: 'image/jpeg',
                    name: 'reply-image.jpg',
                });
            }

            await api.post(`/comment/${commentId}/reply/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setReplyImage(null);
            setReplyingTo(null);
            const data = await getPostComments(post.id);
            setComments(buildCommentTree(data));

            if (onCommentAdded) {
                onCommentAdded(data.length);
            }

            const updatedComments = await getPostComments(post.id);
            setComments(buildCommentTree(updatedComments));
        } catch (error) {
            console.error("Error replying to comment:", error);
        }
    };



    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <FlatList
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 30 }}
                data={comments}
                keyExtractor={(item) => item.id.toString()}
                ListHeaderComponent={
                    <View>
                        <View style={styles.post}>
                            <Image source={{ uri: cleanAvatarUrlAvatar }} style={styles.avatar} />
                            <View>
                                {post.user.first_name || post.user.last_name ? (
                                    <Text style={styles.username}>{post.user.first_name} {post.user.last_name}</Text>
                                ) : (<Text style={styles.username}>Quản Trị Viên</Text>)}
                                <Text style={styles.postTime}>{moment(post.created_date).fromNow()}</Text>
                            </View>
                            {post.object_type === "survey" && (
                                <TouchableOpacity onPress={() => navigation.navigate('SurveyScreen', { post: post })} style={{ flex: 1, alignItems: "flex-end" }}>
                                    <Text style={{ color: '#007BFF' }}>Tiến hành khảo sát</Text>
                                </TouchableOpacity>
                            )}
                            {(user.role === 0 || user.id === post.user.id) && (
                                <TouchableOpacity onPress={handleToggleCommentsLock} style={{ marginLeft: 200 }}>
                                    <Ionicons name={commentsLocked ? "lock-closed" : "lock-open"} size={24} color="red" />
                                </TouchableOpacity>
                            )}
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
                        {!commentsLocked && (
                            <View style={styles.commentInputContainer}>
                                <TextInput
                                    key={inputKey}
                                    style={styles.commentInput}
                                    defaultValue={commentContentRef.current}
                                    onChangeText={(text) => (commentContentRef.current = text)}
                                    placeholder="Viết bình luận..."
                                    multiline
                                />
                                <TouchableOpacity onPress={() => selectImage(setCommentImage)}>
                                    <Ionicons name="image-outline" size={24} color="blue" />
                                </TouchableOpacity>
                                <IconButton icon="send" iconColor="#007BFF" size={30} onPress={handleComment} />
                            </View>
                        )}
                        {commentImage && (
                            <View style={styles.selectedImageContainer}>
                                <Image source={{ uri: commentImage }} style={styles.selectedImage} />
                                <TouchableOpacity onPress={() => setCommentImage(null)}>
                                    <Ionicons name="close-circle" size={24} color="red" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                }
                extraData={comments}
                renderItem={({ item }) => <CommentItem comment={item} onReply={setReplyingTo} />}
            />
        </KeyboardAvoidingView>
    );
};

export const styles = StyleSheet.create({
    commentContainer: {
        backgroundColor: '#eeee',
        borderRadius: 10,
        paddingBottom: 10,
        paddingLeft: 10,
        paddingRight: 10,
    },
    container: {
        padding: 16,
        backgroundColor: "#fff",
        flex: 1,
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
        alignItems: "flex-start",
        marginTop: 10,
    },
    commentHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    commentAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10
    },
    commentUser: {
        fontWeight: "bold",
        marginRight: 10,
    },
    commentText: {
        fontSize: 14,
        wordBreak: 'break-word',
        flex: 1
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
    commentTime: {
        fontSize: 14,
        color: "#888",
        marginTop: 5,
        marginStart: 10,
    },
    replyButton: {
        color: "#007BFF",
        marginTop: 5,
        fontSize: 14,
    },
    replyContainer: {
        flexDirection: "column",
        marginTop: 10,
        flexWrap: "wrap",
    },
    replyActions: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
    },
    replyInput: {
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 5,
        padding: 10,
        marginRight: 10,
        minWidth: 200,
    },
    commentInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
    },
    commentInput: {
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 5,
        padding: 10,
        marginRight: 10,
        minHeight: 40,
        flex: 1,
    },
    commentImage: {
        width: 100,
        height: 100,
        borderRadius: 10,
        marginTop: 10,
    },
    selectedImageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    selectedImage: {
        width: 50,
        height: 50,
        borderRadius: 10,
        marginRight: 10,
    },
    sendButton: {
        backgroundColor: '#007BFF',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    sendButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    deleteAndEditContainer: {
        flexDirection: 'row',
    },
});

export default PostDetailScreen;