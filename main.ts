declare interface Math {
    floor(x: number): number;
}


//% color=#27b0ba icon="\uf26c"
namespace OLED {


    /**
     * Select direction for drawing lines
     */
    export enum LineDirectionSelection {
        //% block="horizontal"
        horizontal,
        //% block="vertical"
        vertical
    }

    /**
     * Select direction for drawing lines
     */
    export enum FillSelection {
        //% block="not filled"
        notFilled,
        //% block="filled"
        filled
    }

    let font: Buffer;


    const SSD1306_SETCONTRAST = 0x81
    const SSD1306_SETCOLUMNADRESS = 0x21
    const SSD1306_SETPAGEADRESS = 0x22
    const SSD1306_DISPLAYALLON_RESUME = 0xA4
    const SSD1306_DISPLAYALLON = 0xA5
    const SSD1306_NORMALDISPLAY = 0xA6
    const SSD1306_INVERTDISPLAY = 0xA7
    const SSD1306_DISPLAYOFF = 0xAE
    const SSD1306_DISPLAYON = 0xAF
    const SSD1306_SETDISPLAYOFFSET = 0xD3
    const SSD1306_SETCOMPINS = 0xDA
    const SSD1306_SETVCOMDETECT = 0xDB
    const SSD1306_SETDISPLAYCLOCKDIV = 0xD5
    const SSD1306_SETPRECHARGE = 0xD9
    const SSD1306_SETMULTIPLEX = 0xA8
    const SSD1306_SETLOWCOLUMN = 0x00
    const SSD1306_SETHIGHCOLUMN = 0x10
    const SSD1306_SETSTARTLINE = 0x40
    const SSD1306_MEMORYMODE = 0x20
    const SSD1306_COMSCANINC = 0xC0
    const SSD1306_COMSCANDEC = 0xC8
    const SSD1306_SEGREMAP = 0xA0
    const SSD1306_CHARGEPUMP = 0x8D
    const chipAdress = 0x3C
    const xOffset = 0
    const yOffset = 0
    let charX = 0
    let charY = 0
    let displayWidth = 128
    let displayHeight = 64 / 8
    let screenSize = 0
    //let font: Array<Array<number>>
    let loadStarted: boolean;
    let loadPercent: number;

    let fontZoom: number = 1;

    let screenBuf = pins.createBuffer(1025);

    function command(cmd: number) {
        let buf = pins.createBuffer(2)
        buf[0] = 0x00
        buf[1] = cmd
        pins.i2cWriteBuffer(chipAdress, buf, false)
    }

    //% block="set Font $zoom zoom"
    //% zoom.min=1 zoom.max=2
    //% weight=2
    export function setFontZomm(zoom: number) {
        fontZoom = zoom
    }

    //% block="clear OLED display"
    //% weight=3
    export function clear() {
        loadStarted = false
        loadPercent = 0
        command(SSD1306_SETCOLUMNADRESS)
        command(0x00)
        command(displayWidth - 1)
        command(SSD1306_SETPAGEADRESS)
        command(0x00)
        command(displayHeight - 1)
        let data = pins.createBuffer(17);
        data[0] = 0x40; // Data Mode
        for (let i = 1; i < 17; i++) {
            data[i] = 0x00
        }
        // send display buffer in 16 byte chunks
        for (let i = 0; i < screenSize; i += 16) {
            pins.i2cWriteBuffer(chipAdress, data, false)
        }
        charX = xOffset
        charY = yOffset
    }

    function drawLoadingFrame() {
        command(SSD1306_SETCOLUMNADRESS)
        command(0x00)
        command(displayWidth - 1)
        command(SSD1306_SETPAGEADRESS)
        command(0x00)
        command(displayHeight - 1)
        let col = 0
        let page = 0
        let data = pins.createBuffer(17);
        data[0] = 0x40; // Data Mode
        let i = 1
        for (let page = 0; page < displayHeight; page++) {
            for (let col = 0; col < displayWidth; col++) {
                if (page === 3 && col > 12 && col < displayWidth - 12) {
                    data[i] = 0x60
                } else if (page === 5 && col > 12 && col < displayWidth - 12) {
                    data[i] = 0x06
                } else if (page === 4 && (col === 12 || col === 13 || col === displayWidth - 12 || col === displayWidth - 13)) {
                    data[i] = 0xFF
                } else {
                    data[i] = 0x00
                }
                if (i === 16) {
                    pins.i2cWriteBuffer(chipAdress, data, false)
                    i = 1
                } else {
                    i++
                }

            }
        }
        charX = 30
        charY = 2
        writeString("Loading:")
    }
    function drawLoadingBar(percent: number) {
        charX = 78
        charY = 2
        let num = Math.floor(percent)
        writeNum(num)
        writeString("%")
        let width = displayWidth - 14 - 13
        let lastStart = width * (loadPercent / displayWidth)
        command(SSD1306_SETCOLUMNADRESS)
        command(14 + lastStart)
        command(displayWidth - 13)
        command(SSD1306_SETPAGEADRESS)
        command(4)
        command(5)
        let data = pins.createBuffer(2);
        data[0] = 0x40; // Data Mode
        data[1] = 0x7E
        for (let i = lastStart; i < width * (Math.floor(percent) / 100); i++) {
            pins.i2cWriteBuffer(chipAdress, data, false)
        }
        loadPercent = num
    }

    //% block="draw loading bar at $percent percent"
    //% percent.min=0 percent.max=100
    //% weight=2
    export function drawLoading(percent: number) {
        if (loadStarted) {
            drawLoadingBar(percent)
        } else {
            drawLoadingFrame()
            drawLoadingBar(percent)
            loadStarted = true
        }
    }
    //% block="clear line $line"
    //% line.min=0 line.max=7
    //% weight=6
    export function clearLine(line: number) {
        charX = 0;
        charY = line;
        let str = " ";
        for (let i = 0; i < 20; i++) {
            if (charX > displayWidth - 6) {
                charX = 0;
            }
            drawChar(charX, charY, str.charAt(i))
            charX += 6
        }
    }
    //% block="show string $str at $line"
    //% line.min=0 line.max=7
    //% weight=6
    export function writeStringAtLine(str: string, line: number) {
        charX = 0;
        charY = line;
        for (let i = 0; i < str.length; i++) {
            if (charX > displayWidth - 6) {
                newLine()
            }
            drawChar(charX, charY, str.charAt(i))
            charX += 6
        }
    }
    //% block="show number $n at $line"
    //% line.min=0 line.max=7
    //% weight=5
    export function writeNumAtLine(n: number, line: number) {
        let numString = n.toString()
        writeStringAtLine(numString, line)
    }

    //% block="show (without newline) string $str"
    //% weight=6
    export function writeString(str: string) {
        for (let i = 0; i < str.length; i++) {
            if (charX > displayWidth - 6) {
                newLine()
            }
            drawChar(charX, charY, str.charAt(i))
            charX += 6
        }
    }
    //% block="show (without newline) number $n"
    //% weight=5
    export function writeNum(n: number) {
        let numString = n.toString()
        writeString(numString)
    }
    //% block="show string $str"
    //% weight=8
    export function writeStringNewLine(str: string) {
        writeString(str)
        newLine()
    }
    //% block="show number $n"
    //% weight=7
    export function writeNumNewLine(n: number) {
        writeNum(n)
        newLine()
    }
    //% block="insert newline"
    //% weight=4
    export function newLine() {
        charY++
        charX = xOffset
    }
    function drawChar(x: number, y: number, c: string) {

        command(SSD1306_SETCOLUMNADRESS)
        command(x)
        if(fontZoom==1)
            command(x + 5)
        else
            command(x + 5 + 6)
        command(SSD1306_SETPAGEADRESS)
        command(y)
        command(y + 1)
        let line = pins.createBuffer(2)
        line[0] = 0x40
        for (let i = 0; i < 6; i++) {
            if (i === 5) {
                line[1] = 0x00
            } else {
                let charIndex = c.charCodeAt(0)
                let charNumber = font.getNumber(NumberFormat.UInt8BE, 5 * charIndex + i)
                line[1] = charNumber

            }
            pins.i2cWriteBuffer(chipAdress, line, false)

            if(fontZoom!=1)
                pins.i2cWriteBuffer(chipAdress, line, false)
        }

    }
    function drawShape(pixels: Array<Array<number>>) {
        let x1 = displayWidth
        let y1 = displayHeight * 8
        let x2 = 0
        let y2 = 0
        for (let i = 0; i < pixels.length; i++) {
            if (pixels[i][0] < x1) {
                x1 = pixels[i][0]
            }
            if (pixels[i][0] > x2) {
                x2 = pixels[i][0]
            }
            if (pixels[i][1] < y1) {
                y1 = pixels[i][1]
            }
            if (pixels[i][1] > y2) {
                y2 = pixels[i][1]
            }
        }
        let page1 = Math.floor(y1 / 8)
        let page2 = Math.floor(y2 / 8)
        let line = pins.createBuffer(2)
        line[0] = 0x40
        for (let x = x1; x <= x2; x++) {
            for (let page = page1; page <= page2; page++) {
                line[1] = 0x00
                for (let i = 0; i < pixels.length; i++) {
                    if (pixels[i][0] === x) {
                        if (Math.floor(pixels[i][1] / 8) === page) {
                            line[1] |= Math.pow(2, (pixels[i][1] % 8))
                        }
                    }
                }
                if (line[1] !== 0x00) {
                    command(SSD1306_SETCOLUMNADRESS)
                    command(x)
                    command(x + 1)
                    command(SSD1306_SETPAGEADRESS)
                    command(page)
                    command(page + 1)
                    //line[1] |= pins.i2cReadBuffer(chipAdress, 2)[1]
                    pins.i2cWriteBuffer(chipAdress, line, false)
                }
            }
        }
    }

    // Set the starting on the display for writing text
    function set_pos(col: number = 0, page: number = 0) {
        command(0xb0 | page) // page number
        command(SSD1306_SETLOWCOLUMN | (col % 16)) // lower start column address
        command(SSD1306_SETHIGHCOLUMN | (col >> 4)) // upper start column address    
    }

    /**
     * Using (x, y) coordinates, turn on a selected pixel on the screen.
     * @param x is the X axis value, eg: 0
     * @param y is the Y axis value, eg: 0
     */
    //% blockId="VIEW128x64_set_pixel" block="show pixel at x %x|y %y"
    //% group="Show"
    //% weight=70 blockGap=8
    //% x.min=0, x.max=127
    //% y.min=0, y.max=63
    //% inlineInputMode=inline
    export function setPixel(x: number, y: number) {

        //if (initialised == 0)
        //    initDisplay()

        if (x < 0)
            x = 0
        
        if (x > 127)
            x = 127

        if (y < 0)
            y = 0

        if (y > 63)
            y = 63

        let page = y >> 3
        let shift_page = y % 8                                  // Calculate the page to write to
        let ind = x + page * 128 + 1                            // Calculate which register in the page to write to
        let screenPixel = (screenBuf[ind] | (1 << shift_page))  // Set the screen data byte
        screenBuf[ind] = screenPixel                            // Store data in screen buffer
        set_pos(x, page)                                        // Set the position on the screen to write at 
        let writeOneByteBuf = pins.createBuffer(2)
        writeOneByteBuf[0] = 0x40                               // Load buffer with command
        writeOneByteBuf[1] = screenPixel                        // Load buffer with byte
        pins.i2cWriteBuffer(chipAdress, writeOneByteBuf)    // Send data to screen
    }

    /**
     * Draw a line of a specific length in pixels, using the (x, y) coordinates as a starting point.
     * @param lineDirection is the selection of either horizontal line or vertical line
     * @param x is start position on the X axis, eg: 0
     * @param y is start position on the Y axis, eg: 0
     * @param len is the length of line, length is the number of pixels, eg: 10
     */
    //% blockId="VIEW128x64_draw_line" block="draw a %lineDirection | line with length of %len starting at x %x|y %y"
    //% weight=72 blockGap=8
    //% group="Draw"
    //% x.min=0, x.max=127
    //% y.min=0, y.max=63
    //% len.min=-128, len.max=128
    //% inlineInputMode=inline
    export function drawLine2(lineDirection: LineDirectionSelection, len: number, x: number, y: number) {

        if (x < 0)
            x = 0

        if (x > 127)
            x = 127

        if (y < 0)
            y = 0

        if (y > 63)
            y = 63

        if (lineDirection == LineDirectionSelection.horizontal) {

            if (len > 128) //check line length is not greater than screen length
                len = 128       //if so, set to screen length max

            else if (len < 0) {  //check if the line is a negative number

                if (len < -128)   //limit to maximum screen length as a negative number
                    len = -128      //set max negative line limit horizontal

                len = Math.abs(len) //take absolute of the number for the length
                x = x - len         //move the X point to the start of the line as drawing left to riight

                if (x < 0) {         //check if X is now a negative number

                    len = len + x   //if so then length calulated to 0 point
                    x = 0           //x is now 0
                }
            }

            if ((x + len) > 128)     //check that the length of line from the X start point does not exceed the screen limits
                len = 128 - x       //if so adjust length to the length from X to the end of screen
            
            for (let hPixel = x; hPixel < (x + len); hPixel++)      // Loop to set the pixels in the horizontal line
                setPixel(hPixel, y)
        } else if (lineDirection == LineDirectionSelection.vertical) {

            if (len > 64)          // check for max vertical length
                len = 64            //if so, set to screen height max
            
            else if (len < 0) {     //check if the line is a negative number

                if (len < -64)    //limit to maximum screen length as a negative number
                    len = -64       //set max negative line limit vertically
                
                len = Math.abs(len) //take absolute value of length and adjust the y value
                y = y - len         //move the Y point to the start of the line as drawing left to riight
                
                if (y < 0) {    //check the y has not gone below 0

                    len = len + y   //if so then length calulated to 0 point
                    y = 0           //y is now 0
                }
            }

            if ((y + len) > 64)   //check that the length of line from the Y start point does not exceed the screen limits
                len = 64 - y        //if so adjust length to the length from X to the end of screen
            
            for (let vPixel = y; vPixel < (y + len); vPixel++)      // Loop to set the pixels in the vertical line
                setPixel(x, vPixel)
        }
    }

    /**
     * Draw a rectangle with a specific width and height in pixels, using the (x, y) coordinates as a starting point.
     * @param filled is the selection of either filled or not
     * @param width is width of the rectangle, eg: 60
     * @param height is height of the rectangle, eg: 30
     * @param x is the start position on the X axis, eg: 0
     * @param y is the start position on the Y axis, eg: 0
     */
    //% blockId="VIEW128x64_draw_rect" block="draw a %filled rectangle %width|wide %height|high from position x %x|y %y"
    //% weight=71 blockGap=8
    //% group="Draw"
    //% inlineInputMode=inline
    //% width.min=1 width.max=127
    //% height.min=1 height.max=63
    //% x.min=0 x.max=127
    //% y.min=0 y.max=63
    export function drawRect2(filled: FillSelection, width: number, height: number, x: number, y: number) {

        if (!x)    // If variable 'x' has not been used, default to x position of 0
            x = 0

        if (!y)    // If variable 'y' has not been used, default to y position of 0
            y = 0

        // Draw the lines for each side of the rectangle
        if(filled){
            for (let dy = y; dy <= y+height; dy++) {
                drawLine2(LineDirectionSelection.horizontal, width, x, dy)
            }
        }else{
            drawLine2(LineDirectionSelection.horizontal, width, x, y)
            drawLine2(LineDirectionSelection.horizontal, width + 1, x, y + height)
            drawLine2(LineDirectionSelection.vertical, height, x, y)
            drawLine2(LineDirectionSelection.vertical, height + 1, x + width, y)
        }
        
    }

    //% block="draw circle at x: $x y: $y radius: $r"
    //% x.defl=64
    //% y.defl=32
    //% r.defl=10
    //% weight=0
    export function drawCircle(x: number, y: number, r: number) {
        let theta = 0;
        let step = Math.PI / 90;  // Adjust step for smoothness

        while (theta < 2 * Math.PI) {
            let xPos = Math.floor(x + r * Math.cos(theta));
            let yPos = Math.floor(y + r * Math.sin(theta));
            setPixel(xPos, yPos)
            theta += step;
        }

    }
    
    //% block="draw filled circle at x: $x y: $y radius: $r"
    //% x.defl=64
    //% y.defl=32
    //% r.defl=10
    //% weight=0
    export function drawFilledCircle(x: number, y: number, r: number) {
        for (let dx = -r; dx <= r; dx++) {
            let height = Math.floor(Math.sqrt(r * r - dx * dx));
            drawLine2(LineDirectionSelection.vertical, height*2, x + dx, y-height)
            //drawLine(x + dx, y - height, x + dx, y + height);
        }
    }
    //% block="initialize OLED with width $width height $height"
    //% width.defl=128
    //% height.defl=64
    //% weight=9
    export function init(width: number, height: number) {
        command(SSD1306_DISPLAYOFF);
        command(SSD1306_SETDISPLAYCLOCKDIV);
        command(0x80);                                  // the suggested ratio 0x80
        command(SSD1306_SETMULTIPLEX);
        command(0x3F);
        command(SSD1306_SETDISPLAYOFFSET);
        command(0x0);                                   // no offset
        command(SSD1306_SETSTARTLINE | 0x0);            // line #0
        command(SSD1306_CHARGEPUMP);
        command(0x14);
        command(SSD1306_MEMORYMODE);
        command(0x00);                                  // 0x0 act like ks0108
        command(SSD1306_SEGREMAP | 0x1);
        command(SSD1306_COMSCANDEC);
        command(SSD1306_SETCOMPINS);
        command(0x12);
        command(SSD1306_SETCONTRAST);
        command(0xCF);
        command(SSD1306_SETPRECHARGE);
        command(0xF1);
        command(SSD1306_SETVCOMDETECT);
        command(0x40);
        command(SSD1306_DISPLAYALLON_RESUME);
        command(SSD1306_NORMALDISPLAY);
        command(SSD1306_DISPLAYON);
        displayWidth = width
        displayHeight = height / 8
        screenSize = displayWidth * displayHeight
        charX = xOffset
        charY = yOffset
        font = hex`
    0000000000
    3E5B4F5B3E
    3E6B4F6B3E
    1C3E7C3E1C
    183C7E3C18
    1C577D571C
    1C5E7F5E1C
    00183C1800
    FFE7C3E7FF
    0018241800
    FFE7DBE7FF
    30483A060E
    2629792926
    407F050507
    407F05253F
    5A3CE73C5A
    7F3E1C1C08
    081C1C3E7F
    14227F2214
    5F5F005F5F
    06097F017F
    006689956A
    6060606060
    94A2FFA294
    08047E0408
    10207E2010
    08082A1C08
    081C2A0808
    1E10101010
    0C1E0C1E0C
    30383E3830
    060E3E0E06
    0000000000
    00005F0000
    0007000700
    147F147F14
    242A7F2A12
    2313086462
    3649562050
    0008070300
    001C224100
    0041221C00
    2A1C7F1C2A
    08083E0808
    0080703000
    0808080808
    0000606000
    2010080402
    3E5149453E
    00427F4000
    7249494946
    2141494D33
    1814127F10
    2745454539
    3C4A494931
    4121110907
    3649494936
    464949291E
    0000140000
    0040340000
    0008142241
    1414141414
    0041221408
    0201590906
    3E415D594E
    7C1211127C
    7F49494936
    3E41414122
    7F4141413E
    7F49494941
    7F09090901
    3E41415173
    7F0808087F
    00417F4100
    2040413F01
    7F08142241
    7F40404040
    7F021C027F
    7F0408107F
    3E4141413E
    7F09090906
    3E4151215E
    7F09192946
    2649494932
    03017F0103
    3F4040403F
    1F2040201F
    3F4038403F
    6314081463
    0304780403
    6159494D43
    007F414141
    0204081020
    004141417F
    0402010204
    4040404040
    0003070800
    2054547840
    7F28444438
    3844444428
    384444287F
    3854545418
    00087E0902
    18A4A49C78
    7F08040478
    00447D4000
    2040403D00
    7F10284400
    00417F4000
    7C04780478
    7C08040478
    3844444438
    FC18242418
    18242418FC
    7C08040408
    4854545424
    04043F4424
    3C4040207C
    1C2040201C
    3C4030403C
    4428102844
    4C9090907C
    4464544C44
    0008364100
    0000770000
    0041360800
    0201020402
    3C2623263C
    1EA1A16112
    3A4040207A
    3854545559
    2155557941
    2154547841
    2155547840
    2054557940
    0C1E527212
    3955555559
    3954545459
    3955545458
    0000457C41
    0002457D42
    0001457C40
    F0292429F0
    F0282528F0
    7C54554500
    2054547C54
    7C0A097F49
    3249494932
    3248484832
    324A484830
    3A4141217A
    3A42402078
    009DA0A07D
    3944444439
    3D4040403D
    3C24FF2424
    487E494366
    2B2FFC2F2B
    FF0929F620
    C0887E0903
    2054547941
    0000447D41
    3048484A32
    384040227A
    007A0A0A72
    7D0D19317D
    2629292F28
    2629292926
    30484D4020
    3808080808
    0808080838
    2F10C8ACBA
    2F102834FA
    00007B0000
    08142A1422
    22142A1408
    AA005500AA
    AA55AA55AA
    000000FF00
    101010FF00
    141414FF00
    1010FF00FF
    1010F010F0
    141414FC00
    1414F700FF
    0000FF00FF
    1414F404FC
    141417101F
    10101F101F
    1414141F00
    101010F000
    0000001F10
    1010101F10
    101010F010
    000000FF10
    1010101010
    101010FF10
    000000FF14
    0000FF00FF
    00001F1017
    0000FC04F4
    1414171017
    1414F404F4
    0000FF00F7
    1414141414
    1414F700F7
    1414141714
    10101F101F
    141414F414
    1010F010F0
    00001F101F
    0000001F14
    000000FC14
    0000F010F0
    1010FF10FF
    141414FF14
    1010101F00
    000000F010
    FFFFFFFFFF
    F0F0F0F0F0
    FFFFFF0000
    000000FFFF
    0F0F0F0F0F
    3844443844
    7C2A2A3E14
    7E02020606
    027E027E02
    6355494163
    3844443C04
    407E201E20
    06027E0202
    99A5E7A599
    1C2A492A1C
    4C7201724C
    304A4D4D30
    3048784830
    BC625A463D
    3E49494900
    7E0101017E
    2A2A2A2A2A
    44445F4444
    40514A4440
    40444A5140
    0000FF0103
    E080FF0000
    08086B6B08
    3612362436
    060F090F06
    0000181800
    0000101000
    3040FF0101
    001F01011E
    00191D1712
    003C3C3C3C
    0000000000`
        loadStarted = false
        loadPercent = 0
        clear()
    }
} 
