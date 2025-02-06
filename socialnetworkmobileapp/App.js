import React, { useContext, useReducer } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Icon, IconButton } from 'react-native-paper';
import Home from './components/Home/Home';
import Register from './components/User/Register';
import Login from './components/User/Login';
import ChangePassword from './components/User/ChangePassword';
import UserProfile from './components/User/UserProfile';
import Approve from './components/Administration/Approve';
import CreateAccount from './components/Administration/CreateAccount';
import PostDetailScreen from './components/PostDetailScreen';
import { MyDispatchContext, MyUserContext } from './configs/UserContexts';
import MyUserReducer from './configs/UserReducers';
import Administration from './components/Administration/Administration';
import ResetTimer from './components/Administration/ResetTimer';
import CreatePostScreen from './components/CreatePostScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import CreateSurvey from './components/CreateSurvey';
import Survey from './components/Survey';
import CreateInvitation from './components/CreateInvitation';
import UpdatePost from './components/UpdatePost';
import UpdateSurvey from './components/UpdateSurvey';
import TimeLine from './components/TimeLine/TimeLine';
import { View } from 'react-native';
import UsersList from './components/Chat/UserList';
import Chat from './components/Chat/chat';

const Stack = createNativeStackNavigator();
const Tab = createMaterialTopTabNavigator();
const HomeStackNavigator = () => {
    const navigation = useNavigation();

    return (
        <Stack.Navigator>
            <Stack.Screen
                name="HomeScreen"
                component={Home}
                options={{
                    title: 'Trang chủ',
                    headerBackVisible: false,
                    headerRight: () => (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <IconButton
                            icon="newspaper-variant-multiple-outline"
                            size={24}
                            onPress={() => navigation.navigate('HomeStack', { screen: 'TimeLineScreen' })}
                            color='black'
                        />
                        <IconButton
                            icon="pencil-plus"
                            size={24}
                            onPress={() => navigation.navigate('HomeStack', { screen: 'CreatePostScreen' })}
                            color='black'
                        />
                        </View>
                    )
                }}
            />
            <Stack.Screen name="PostDetailScreen" component={PostDetailScreen} options={{ title: 'Bài viết'}} />
            <Stack.Screen name="CreatePostScreen" component={CreatePostScreen} options={{ title: 'Tạo bài viết' }} />
            <Stack.Screen name="CreateSurveyScreen" component={CreateSurvey} options={{ title: 'Tạo khảo sát' }}/>
            <Stack.Screen name="CreateInvitationScreen" component={CreateInvitation} options={{ title: 'Tạo thư mời' }}/>
            <Stack.Screen name="SurveyScreen" component={Survey} options={{ title: 'Khảo sát' }}/>
            <Stack.Screen name="UpdatePostScreen" component={UpdatePost} options={{ title: 'Chỉnh sửa bài viết' }} />
            <Stack.Screen name="UpdateSurveyScreen" component={UpdateSurvey} options={{ title: 'Chỉnh sửa khảo sát' }}/>
            <Stack.Screen name="TimeLineScreen" component={TimeLine} options={{ title: 'Dòng thời gian' }} />
        </Stack.Navigator>
    );
};


const AdminStackNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="AdministrationScreen" component={Administration} options={{ title: 'Quản trị', headerBackVisible: false }} />
            <Stack.Screen name="ApproveScreen" component={Approve} options={{ title: 'Duyệt tài khoản' }} />
            <Stack.Screen name="CreateAccountScreen" component={CreateAccount} options={{ title: 'Tạo tài khoản giáo viên' }} />
            <Stack.Screen name="ResetTimerScreen" component={ResetTimer} options={{ title: 'Đặt lại thời gian đổi mật khẩu' }} />
        </Stack.Navigator>
    );
};


const ProfileStackNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="UserProfileScreen" component={UserProfile} options={{ title: 'Tài khoản', headerBackVisible: false }} />
            <Stack.Screen name="ChangePasswordScreen" component={ChangePassword} options={{ title: 'Đổi mật khẩu' }} />
        </Stack.Navigator>
    );
};

const ChatStackNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="UserListScreen" component={UsersList} options={{ title: 'Chọn tin nhắn', headerBackVisible: false }} />
            <Stack.Screen name="ChatScreen" component={Chat} options={{ title: 'Tin nhắn' }} />
        </Stack.Navigator>
    );
};

const TabNavigator = () => {
    const user = useContext(MyUserContext);

    return (
        <Tab.Navigator screenOptions={{ tabBarShowLabel: false }}>
            {user === null ? (
                <>
                <Tab.Screen name="LoginScreen" component={Login} options={{ title: 'Đăng nhập', tabBarIcon: ({ color, size }) => <Icon source="login" color={color} size={size} /> }} />
                    <Tab.Screen name="RegisterScreen" component={Register} options={{ title: 'Đăng ký', tabBarIcon: ({ color, size }) => <Icon source="account-plus" color={color} size={size} /> }} />
                </>
            ) : (
                <>
                    <Tab.Screen name="HomeStack" component={HomeStackNavigator} options={{ tabBarIcon: ({ color, size }) => <Icon source="home" color={color} size={size} /> }} />
                    <Tab.Screen name="ChatStack" component={ChatStackNavigator} options={{ title: 'Chat', tabBarIcon: ({ color, size }) => <Icon source="message" color={color} size={size} /> }} />
                    {user.role === 0 && (
                        <Tab.Screen name="AdminStack" component={AdminStackNavigator} options={{ title: 'Quản trị', tabBarIcon: ({ color, size }) => <Icon source="shield-account" color={color} size={size} /> }} />
                    )}
                    <Tab.Screen name="ProfileStack" component={ProfileStackNavigator} options={{ title: 'Tài khoản', tabBarIcon: ({ color, size }) => <Icon source="account-cog" color={color} size={size} /> }} />
                </>
            )}
        </Tab.Navigator>
    );
}

export default function App() {
    const [user, dispatch] = useReducer(MyUserReducer, null);

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <NavigationContainer>
                <MyUserContext.Provider value={user}>
                    <MyDispatchContext.Provider value={dispatch}>
                        <TabNavigator />
                    </MyDispatchContext.Provider>
                </MyUserContext.Provider>
            </NavigationContainer>
        </SafeAreaView>
    );
}