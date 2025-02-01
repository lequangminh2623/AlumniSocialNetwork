import React, { useContext, useReducer } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Icon } from 'react-native-paper';
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

const Stack = createNativeStackNavigator();
const Tab = createMaterialTopTabNavigator();

const HomeStackNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="HomeScreen" component={Home} options={{ title: 'Màn hình chính' }} />
            <Stack.Screen name="PostDetailScreen" component={PostDetailScreen} options={{ title: 'Chi tiết bài viết' }} />
        </Stack.Navigator>
    );
}

const ProfileStackNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="UserProfileScreen" component={UserProfile} options={{ title: 'Tài khoản' }} />
            <Stack.Screen name="ChangePasswordScreen" component={ChangePassword} options={{ title: 'Đổi mật khẩu' }} />
        </Stack.Navigator>
    );
}

const AdminStackNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="AdministrationScreen" component={Administration} options={{ title: 'Quản trị' }} />
            <Stack.Screen name="ApproveScreen" component={Approve} options={{ title: 'Duyệt tài khoản' }} />
            <Stack.Screen name="CreateAccountScreen" component={CreateAccount} options={{ title: 'Tạo tài khoản giáo viên' }} />
            <Stack.Screen name="ResetTimerScreen" component={ResetTimer} options={{ title: 'Đặt lại thời gian đổi mật khẩu' }} />
        </Stack.Navigator>
    );
};

const TabNavigator = () => {
    const user = useContext(MyUserContext);

    return (
        <Tab.Navigator>
            <Tab.Screen name="HomeStack" component={HomeStackNavigator} options={{ title: 'Màn hình chính', tabBarIcon: ({ color, size }) => <Icon name="home" color={color} size={size} /> }} />

            {user === null ? (
                <>
                    <Tab.Screen name="RegisterScreen" component={Register} options={{ title: 'Đăng ký', tabBarIcon: ({ color, size }) => <Icon name="account-plus" color={color} size={size} /> }} />
                    <Tab.Screen name="LoginScreen" component={Login} options={{ title: 'Đăng nhập', tabBarIcon: ({ color, size }) => <Icon name="login" color={color} size={size} /> }} />
                </>
            ) : (
                <>
                    <Tab.Screen name="ProfileStack" component={ProfileStackNavigator} options={{ title: 'Tài khoản', tabBarIcon: ({ color, size }) => <Icon name="account" color={color} size={size} /> }} />
                    {user.role === 0 && (
                        <Tab.Screen name="AdminStack" component={AdminStackNavigator} options={{ title: 'Quản trị', tabBarIcon: ({ color, size }) => <Icon name="account-check" color={color} size={size} /> }} />
                    )}
                </>
            )}
        </Tab.Navigator>
    );
}

export default function App() {
    const [user, dispatch] = useReducer(MyUserReducer, null);

    return (
        <NavigationContainer>
            <MyUserContext.Provider value={user}>
                <MyDispatchContext.Provider value={dispatch}>
                    <TabNavigator />
                </MyDispatchContext.Provider>
            </MyUserContext.Provider>
        </NavigationContainer>
    );
}