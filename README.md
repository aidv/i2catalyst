# I2Catalyst

A tool to analyze I2C data.

Dataset comes from PulseView annotation export using I2C decoder, which in this tool is called "snapshots".

I2Catalyst uses an Arduino to write and read I2C data.

Each byte has it's binary representation under it.

### Shortcuts:
* A: Select all packets
* X: Deselect all packets
* F: Toggle first occurances - Hide all packets that have the same value as it's previous neighbour
* R: Run sequence - Iterates through every selected packet and send it to the I2C line
* ESC: Stop running sequence
* D: Toggle between HEX and Decimal values on bytes
* B: Show binary representations only (toggle)

### Serial output

All serial communication will be printed in the web browser developer console.



![](https://github.com//aidv/i2catalyst/blob/master/preview.png?raw=true)
