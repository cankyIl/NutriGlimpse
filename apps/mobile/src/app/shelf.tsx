import {Platform} from 'react-native';
import ShelfGridScreen from '../ui/ShelfNineScreen';
import LegacyShelfScreen from '../ui/LegacyShelfScreen';
export default function ShelfScreen(){return Platform.OS==='ios'?<ShelfGridScreen/>:<LegacyShelfScreen/>;}
