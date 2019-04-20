# I2Catalyst

A tool to analyze I2C data.

Dataset comes from PulseView annotation export using I2C decoder, which in this tool is called "snapshots".

I2Catalyst uses an Arduino to write and read I2C data.

### Features

- Sequencing. Select packets that you want to replay.
- Write packets on the left side, read packets on the right side.
- Packet tagging.
- Byte representation in HEX (default), decimal and binary. Each byte has it's binary representation under it.
- HEX, DEC and BINARY toggling.
- Browser dev console serial communication. Actually it all happens from the NodeJS script, but you get the idea.


## Documentation
Read below.



### Shortcuts:
* A: Select all packets
* X: Deselect all packets
* F: Toggle first occurances - Hide all packets that have the same value as it's previous neighbour
* R: Run sequence - Iterates through every selected packet and send it to the I2C line
* ESC: Stop running sequence
* D: Toggle between HEX and Decimal values on bytes
* B: Show binary representations only (toggle)
* Shift + Scroll:
    On top of a byte: Will increase or decrease the value of the byte.
* T: Toggle tags

### Serial communication
You can see all the serial communication in the browser dev console.

To send data you can run the line ```com.send(string)``` in the dev console.

Command ```com.send('write,addr_hex,byte1_hex, ...byte10_hex')``` will send an (up to) 10 byte packet to a specified address.
Example: ```com.send('write,47,68,65,6C,6C,6F,77,6F,72,6C,64')``` will write ```helloworld``` to address ```0x47``.

## Usage & Functionality

### First Occurances
Packets that are different from it's previous neighbour will be highlighted with a white tint.
All packets under the highlighted packet that are NOT highlighted have the same byte values.

### Changing Addresses and Bytes
There are two ways to manipulate bytes, and one way to manipulate adddresses.

The primary way is to hover the mouse cursor over an address (read/write) or a write byte, holding SHIFT on your keyboard, and then scroll your mouse wheel.

The secondary way to manipulate bytes is to simply click on a write byte field (the area where the write bytes are located) and then enter the HEX values of the bytes.
You can enter up to 10 bytes, as that's what the current Arduino code can handle.

### Sending a packet
Clicking on a packet area to send it to the I2C data line.

### Sequencing
You can create a packet sequence that allows you to replay a specified set of packets.
This makes it much easier to understand what's going on and when something happens.

To create a squence you two options:
- Press A to select all packets. This is filter sensitive, so if you press F first to hide all double occurances and then press A, you'll select only the first occurances. Press X to deselect all packets.

- Click on the packet sequence handle which is located to the left hand side of a write address label, and to the right hand side of a read address label.


NOTE: Selecting a packet that has a read response will automatically select the read packet too.

### Notes, Comments and Tags
Sometimes it's useful to be able to comment/note/tag specific packets.

In I2Catalyst it's called "tagging".

To add a tag, hover the mouse to the very left/right of a packet until you see a tag icon, click the tag icon to start tagging.

ESC will abort tagging and ENTER will confirm the tag.

Erase all text in the tag and press ENTER to remove the tag.

Pressing T on your keyboard will toggle tags on or off.

# Brainstorming

- Add grouping, scripting, conditional filtering, etc etc...

# License & Contribution

This code is free to use for personal usage, may freely be redistributed but may NOT be sold or capitalized off of.
For commercial usage, please contact me by creating a new issue ticket.

![](https://github.com//aidv/i2catalyst/blob/master/preview.png?raw=true)
