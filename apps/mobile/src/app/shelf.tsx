import {Platform} from 'react-native';
import ShelfGridScreen from '../ui/ShelfGridScreen';
import LegacyShelfScreen from '../ui/LegacyShelfScreen';
export default function ShelfScreen(){return Platform.OS==='ios'?<ShelfGridScreen/>:<LegacyShelfScreen/>;}
