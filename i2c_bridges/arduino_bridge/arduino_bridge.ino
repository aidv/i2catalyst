#include <elapsedMillis.h>
//#include <Wire.h>
#include <SoftwareWire.h>

String bridgeVersion = "1.0.2";

int i2c_sda = 32;
int i2c_scl = 33;

SoftwareWire wire;


bool runningNotified = false;

void setup() {
  //digitalWrite( i2c_sda, LOW); //needed to ignore level shifter
  //digitalWrite( i2c_scl, LOW); //needed to ignore level shifter

  Serial.setTimeout(1);
  Serial.begin(2000000);

  //Wire.begin();
  wire = SoftwareWire(i2c_sda, i2c_scl);
  wire.begin();
}



void loop() {
  if (!runningNotified){
    Serial.println("running," + bridgeVersion);
    runningNotified = true;
  }
  
  if (Serial.available() > 0) {
    serialRead();
  }
}



void serialRead() {
  String serialInput = Serial.readString();
  serialInput.trim();

  String cmd = getValue(serialInput, ',', 0);

  /*if (cmd == "setup"){
    wire = SoftwareWire(i2c_sda, i2c_scl);
    wire.begin();
  } else*/
  if (cmd == "write"){
    uint8_t toAddr = hexStrToByte(getValue(serialInput, ',', 1));

    int BYTE_LENGTH = 10;
    String bytesStr[BYTE_LENGTH];
    for (int i = 2; i < BYTE_LENGTH + 2; i++)
      bytesStr[i - 2] = getValue(serialInput, ',', i);


    Serial.print("write,ok," + getValue(serialInput, ',', 1) + ",");

    wire.beginTransmission(toAddr);
    for (int i = 0; i < BYTE_LENGTH; i++){
      if (bytesStr[i] != ""){
        wire.write(hexStrToByte(bytesStr[i]));
        Serial.print(bytesStr[i]);
        Serial.print(",");
      }
    }
    wire.endTransmission();
    
    Serial.println("");
  } else if (cmd == "read"){
    uint8_t toAddr = hexStrToByte(getValue(serialInput, ',', 1));

    uint8_t bytes = getValue(serialInput, ',', 2).toInt();
    
    wire.requestFrom(toAddr, bytes);

    Serial.print("read,");
    for (int i = 0; i < bytes; i++){
      char s[2];
      sprintf(s, "%02x",wire.read());
      Serial.print(s);
      Serial.print(",");
    }
      
    Serial.println("");
  }
  else {
    Serial.println("Not a valid command");
  }

}

byte hexStrToByte(String hexStr){
  return convertCharToHex(hexStr[0])<<4 | convertCharToHex(hexStr[1]);
}

char convertCharToHex(char ch)
{
  char returnType;
  switch(ch)
  {
    case '0': returnType = 0; break;
    case '1': returnType = 1; break;
    case '2': returnType = 2; break;
    case '3': returnType = 3; break;
    case '4': returnType = 4; break;
    case '5': returnType = 5; break;
    case '6': returnType = 6; break;
    case '7': returnType = 7; break;
    case '8': returnType = 8; break;
    case '9': returnType = 9; break;
    case 'A': returnType = 10; break;
    case 'B': returnType = 11; break;
    case 'C': returnType = 12; break;
    case 'D': returnType = 13; break;
    case 'E': returnType = 14; break;
    case 'F': returnType = 15; break;
    default: returnType = 255; break;
  }
  return returnType;
}

String getValue(String data, char separator, int index){
  int found = 0;
  int strIndex[] = {0, -1};
  int maxIndex = data.length() - 1;

  for(int i=0; i<=maxIndex && found<=index; i++){
    if(data.charAt(i) == separator || i == maxIndex){
        found++;
        strIndex[0] = strIndex[1]+1;
        strIndex[1] = (i == maxIndex) ? i+1 : i;
    }
  }

  return found>index ? data.substring(strIndex[0], strIndex[1]) : "";
}

void print_binary(byte b, int num_places){
    int mask=0, n;

    for (n=1; n<=num_places; n++)
    {
        mask = (mask << 1) | 0x0001;
    }
    b = b & mask;  // truncate v to specified number of places

    while(num_places)
    {

        if (b & (0x0001 << num_places-1))
        {
             Serial.print("1");
        }
        else
        {
             Serial.print("0");
        }

        --num_places;
        if(((num_places%4) == 0) && (num_places != 0))
        {
            //Serial.print("_");
        }
    }
}
