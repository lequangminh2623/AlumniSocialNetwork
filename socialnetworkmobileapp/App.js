import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from './components/Home/Home';
import 'moment/locale/vi';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Register from './components/User/Register';
import Login from './components/User/Login';
import ChangePassword from './components/User/ChangePassword';
import { Icon } from 'react-native-paper';
import { MyDispatchContext, MyUserContext } from './configs/UserContexts';
import { useContext, useReducer } from 'react';
import MyUserReducer from './configs/UserReducers';
import UserProfile from './components/User/UserProfile';
import Approve from './components/Alumni/Approve';
import PostDetailScreen from './components/PostDetailScreen';

const Stack = createNativeStackNavigator();

const HomeStackNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="Home" component={Home} options={{ title: 'Màn hình chính' }} />
            <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Chi tiết bài viết' }} />
        </Stack.Navigator>
    );
}

const ProfileStackNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="UserProfile" component={UserProfile} options={{ title: 'Tài khoản' }} />
            <Stack.Screen name="ChangePassword" component={ChangePassword} options={{ title: 'Đổi mật khẩu' }} />
        </Stack.Navigator>
    );
}

const ApproveStackNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="Approve" component={Approve} options={{ title: 'Duyệt tài khoản' }} />
        </Stack.Navigator>
    );
}

const Tab = createBottomTabNavigator();
const TabNavigator = () => {
    const user = useContext(MyUserContext);

    return (
        <Tab.Navigator>
            <Tab.Screen name="HomeStack" component={HomeStackNavigator} options={{ title: 'Màn hình chính', tabBarIcon: ({ color, size }) => <Icon name="home" color={color} size={size} /> }} />

            {user === null ? <>
                <Tab.Screen name="Register" component={Register} options={{ title: 'Đăng ký', tabBarIcon: ({ color, size }) => <Icon name="account-plus" color={color} size={size} /> }} />
                <Tab.Screen name="Login" component={Login} options={{ title: 'Đăng nhập', tabBarIcon: ({ color, size }) => <Icon name="login" color={color} size={size} /> }} />
            </> : <>
                <Tab.Screen name="ProfileStack" component={ProfileStackNavigator} options={{ title: 'Tài khoản', tabBarIcon: ({ color, size }) => <Icon name="account" color={color} size={size} /> }} />
                {user.role === 0 ? <>
                    <Tab.Screen name="ApproveStack" component={ApproveStackNavigator} options={{ title: 'Duyệt tài khoản', tabBarIcon: ({ color, size }) => <Icon name="account-check" color={color} size={size} /> }} />
                </> : null}
            </>}
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