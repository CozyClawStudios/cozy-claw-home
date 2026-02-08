#!/usr/bin/env python3
"""
Cozy Claw Studio - Art Asset Generator
Generates all pixel art assets for Shared House game
Style: Cozy pixel art, top-down RPG view, warm colors
"""

from PIL import Image, ImageDraw
import os
import random

def save_img(img, filename):
    """Save image to assets folder"""
    path = f"/home/zak/.openclaw/workspace/cozy-claw-studio/shared-house/public/assets/{filename}"
    img.save(path, "PNG")
    print(f"Created: {filename}")
    return path

def create_floor_wood(variation=1):
    """Create wooden floor tile (32x32)"""
    img = Image.new('RGBA', (32, 32), (139, 90, 43, 255))
    draw = ImageDraw.Draw(img)
    
    # Wood planks
    colors = [(160, 110, 60, 255), (140, 95, 50, 255), (150, 100, 55, 255)]
    
    for y in range(0, 32, 8):
        color = colors[(y // 8 + variation) % 3]
        draw.rectangle([0, y, 31, y+7], fill=color)
        # Plank lines
        draw.line([(0, y), (31, y)], fill=(100, 60, 30, 255), width=1)
    
    # Wood grain detail
    for i in range(5):
        x = random.randint(2, 30)
        y = random.randint(2, 30)
        draw.point((x, y), fill=(120, 80, 40, 255))
    
    return img

def create_floor_carpet(variation=1):
    """Create carpet tile (32x32)"""
    base_colors = [(180, 130, 100, 255), (160, 110, 130, 255), (140, 120, 90, 255)]
    base = base_colors[variation % 3]
    img = Image.new('RGBA', (32, 32), base)
    draw = ImageDraw.Draw(img)
    
    # Carpet pattern
    pattern_color = (base[0]-20, base[1]-20, base[2]-20, 255)
    
    if variation == 1:
        # Diamond pattern
        for y in range(0, 32, 8):
            for x in range(0, 32, 8):
                if (x + y) % 16 == 0:
                    draw.rectangle([x+2, y+2, x+6, y+6], fill=pattern_color)
    elif variation == 2:
        # Stripes
        for x in range(0, 32, 4):
            draw.rectangle([x, 0, x+2, 31], fill=pattern_color)
    else:
        # Dots
        for y in range(4, 32, 8):
            for x in range(4, 32, 8):
                draw.ellipse([x-2, y-2, x+2, y+2], fill=pattern_color)
    
    return img

def create_floor_tiles(variation=1):
    """Create tile floor (32x32)"""
    img = Image.new('RGBA', (32, 32), (220, 220, 210, 255))
    draw = ImageDraw.Draw(img)
    
    # Tile colors
    colors = [(200, 200, 190, 255), (180, 180, 170, 255), (210, 210, 200, 255)]
    
    # 16x16 tiles
    for y in range(0, 32, 16):
        for x in range(0, 32, 16):
            color = colors[((x+y)//16 + variation) % 3]
            draw.rectangle([x, y, x+15, y+15], fill=color)
            # Grout lines
            draw.rectangle([x, y, x+15, y+15], outline=(150, 150, 140, 255), width=1)
    
    return img

def create_wall_brick(variation=1):
    """Create brick wall (32x32)"""
    img = Image.new('RGBA', (32, 32), (160, 100, 80, 255))
    draw = ImageDraw.Draw(img)
    
    brick_colors = [(170, 110, 90, 255), (150, 95, 75, 255), (180, 120, 100, 255)]
    
    # Brick pattern
    brick_height = 8
    for y in range(0, 32, brick_height):
        offset = (y // brick_height % 2) * 8
        for x in range(-8, 32, 16):
            color = brick_colors[(x + y) % 3]
            draw.rectangle([x+offset+1, y+1, x+offset+14, y+brick_height-1], fill=color)
            # Mortar
            draw.rectangle([x+offset, y, x+offset+15, y+brick_height-1], outline=(130, 80, 60, 255), width=1)
    
    return img

def create_wall_paint(variation=1):
    """Create painted wall (32x32)"""
    colors = [
        (255, 230, 200, 255),  # Warm cream
        (230, 240, 255, 255),  # Soft blue
        (255, 220, 230, 255),  # Soft pink
        (240, 255, 220, 255),  # Sage green
    ]
    base = colors[variation % 4]
    img = Image.new('RGBA', (32, 32), base)
    draw = ImageDraw.Draw(img)
    
    # Subtle texture
    for i in range(20):
        x = random.randint(0, 31)
        y = random.randint(0, 31)
        shade = (base[0]-10, base[1]-10, base[2]-10, 255)
        draw.point((x, y), fill=shade)
    
    return img

def create_sofa(variation=1):
    """Create sofa sprite (64x64 top-down)"""
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Colors
    if variation == 1:
        main_color = (100, 150, 200, 255)  # Blue
        shadow = (70, 110, 150, 255)
    elif variation == 2:
        main_color = (200, 120, 100, 255)  # Red/terracotta
        shadow = (160, 90, 70, 255)
    else:
        main_color = (120, 180, 120, 255)  # Green
        shadow = (80, 140, 80, 255)
    
    # Sofa base (top-down view)
    # Back
    draw.rounded_rectangle([8, 4, 56, 20], radius=4, fill=shadow)
    # Seat
    draw.rounded_rectangle([8, 16, 56, 48], radius=3, fill=main_color)
    # Armrests
    draw.rounded_rectangle([4, 16, 12, 44], radius=2, fill=shadow)
    draw.rounded_rectangle([52, 16, 60, 44], radius=2, fill=shadow)
    # Cushions
    draw.rectangle([14, 22, 30, 42], fill=(main_color[0]+15, main_color[1]+15, main_color[2]+15, 255))
    draw.rectangle([34, 22, 50, 42], fill=(main_color[0]+15, main_color[1]+15, main_color[2]+15, 255))
    
    return img

def create_plant(variation=1, big=False):
    """Create plant sprite"""
    size = 64 if big else 64
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Pot
    pot_color = (180, 100, 60, 255)
    pot_x, pot_y = 24 if big else 24, 44 if big else 48
    pot_w, pot_h = 16 if big else 16, 14 if big else 12
    draw.polygon([
        (pot_x, pot_y), (pot_x + pot_w, pot_y),
        (pot_x + pot_w - 2, pot_y + pot_h), (pot_x + 2, pot_y + pot_h)
    ], fill=pot_color)
    
    # Plant colors
    leaf_colors = [
        (80, 160, 80, 255),   # Green
        (100, 180, 100, 255),
        (60, 140, 60, 255),
    ]
    
    # Leaves (top-down view of plant)
    center_x, center_y = 32, 36 if big else 38
    
    if variation == 1:
        # Round leafy plant
        for i in range(8):
            angle = i * 45
            import math
            rad = math.radians(angle)
            leaf_x = center_x + int(12 * math.cos(rad))
            leaf_y = center_y + int(10 * math.sin(rad))
            draw.ellipse([leaf_x-6, leaf_y-6, leaf_x+6, leaf_y+6], 
                        fill=leaf_colors[i % 3])
        draw.ellipse([center_x-8, center_y-8, center_x+8, center_y+8], 
                    fill=leaf_colors[1])
    elif variation == 2:
        # Tall plant
        for i in range(5):
            offset = (i - 2) * 8
            draw.ellipse([center_x + offset - 5, center_y - 8 - abs(offset)//2, 
                         center_x + offset + 5, center_y + 2 - abs(offset)//2], 
                        fill=leaf_colors[i % 3])
    else:
        # Spiky plant
        for i in range(12):
            angle = i * 30
            import math
            rad = math.radians(angle)
            end_x = center_x + int(15 * math.cos(rad))
            end_y = center_y + int(12 * math.sin(rad))
            draw.line([(center_x, center_y), (end_x, end_y)], 
                     fill=leaf_colors[i % 3], width=3)
        draw.ellipse([center_x-6, center_y-6, center_x+6, center_y+6], 
                    fill=leaf_colors[0])
    
    return img

def create_tv(variation=1):
    """Create TV sprite (64x64 top-down)"""
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # TV frame
    frame_color = (40, 40, 40, 255)
    screen_color = (20, 20, 40, 255) if variation == 1 else (30, 30, 50, 255)
    
    # TV body (top-down view, so we see the top/back)
    draw.rectangle([12, 8, 52, 40], fill=frame_color, outline=(20, 20, 20, 255), width=2)
    # Screen
    draw.rectangle([16, 12, 48, 36], fill=screen_color)
    # Stand
    draw.rectangle([26, 40, 38, 52], fill=(60, 60, 60, 255))
    draw.ellipse([22, 48, 42, 58], fill=(80, 80, 80, 255))
    
    # Screen glow effect
    if variation == 2:
        draw.rectangle([18, 14, 30, 24], fill=(100, 100, 150, 100))
    
    return img

def create_bookshelf(variation=1):
    """Create bookshelf sprite (64x64 top-down)"""
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Wood colors
    wood = (140, 100, 60, 255)
    wood_dark = (110, 75, 45, 255)
    
    # Bookshelf frame (top-down)
    draw.rectangle([8, 8, 56, 52], fill=wood, outline=wood_dark, width=2)
    
    # Shelves with books
    book_colors = [
        (200, 80, 80, 255), (80, 120, 200, 255), (200, 180, 80, 255),
        (120, 180, 120, 255), (180, 120, 180, 255), (120, 120, 120, 255)
    ]
    
    # Draw shelves and books
    for shelf_y in [16, 28, 40]:
        draw.line([(10, shelf_y), (54, shelf_y)], fill=wood_dark, width=2)
        # Random books
        x = 12
        while x < 50:
            book_w = random.choice([4, 5, 6])
            if x + book_w > 52:
                break
            color = random.choice(book_colors)
            draw.rectangle([x, shelf_y - 10, x + book_w, shelf_y], fill=color, 
                          outline=(color[0]-30, color[1]-30, color[2]-30, 255), width=1)
            x += book_w + 1
    
    return img

def create_table(variation=1, dining=False):
    """Create table sprite (64x64 top-down)"""
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    if dining:
        # Dining table - rectangular
        table_color = (160, 120, 80, 255)
        table_dark = (130, 95, 60, 255)
        
        # Table top
        draw.rectangle([8, 16, 56, 48], fill=table_color, outline=table_dark, width=2)
        # Legs visible from top
        draw.rectangle([10, 18, 14, 22], fill=table_dark)
        draw.rectangle([50, 18, 54, 22], fill=table_dark)
        draw.rectangle([10, 42, 14, 46], fill=table_dark)
        draw.rectangle([50, 42, 54, 46], fill=table_dark)
    else:
        # Coffee table - round/oval
        table_color = (100, 80, 60, 255) if variation == 1 else (140, 140, 140, 255)
        table_dark = (75, 60, 45, 255) if variation == 1 else (100, 100, 100, 255)
        
        # Table top (oval from top)
        draw.ellipse([12, 20, 52, 44], fill=table_color, outline=table_dark, width=2)
        # Simple leg base
        draw.ellipse([26, 32, 38, 40], fill=table_dark)
    
    return img

def create_lamp(variation=1):
    """Create lamp sprite (64x64 top-down)"""
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Lamp base
    base_color = (80, 80, 80, 255) if variation == 1 else (160, 140, 100, 255)
    shade_color = (255, 240, 200, 255) if variation == 1 else (240, 220, 255, 255)
    
    # Base (visible from top)
    draw.ellipse([24, 52, 40, 60], fill=base_color)
    # Pole
    draw.rectangle([30, 24, 34, 54], fill=(100, 100, 100, 255))
    # Lamp shade (from top, just the top rim)
    draw.ellipse([16, 12, 48, 32], fill=shade_color, outline=(200, 180, 150, 255), width=2)
    draw.ellipse([20, 16, 44, 28], fill=(255, 250, 220, 255))
    
    return img

def create_bed(variation=1):
    """Create bed sprite (64x64 top-down)"""
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Colors
    frame_color = (120, 80, 50, 255)
    mattress = (240, 240, 240, 255)
    
    if variation == 1:
        blanket = (100, 150, 200, 255)  # Blue
        pillow = (255, 255, 255, 255)
    elif variation == 2:
        blanket = (200, 120, 140, 255)  # Pink
        pillow = (255, 240, 240, 255)
    else:
        blanket = (140, 180, 120, 255)  # Green
        pillow = (245, 255, 245, 255)
    
    # Bed frame
    draw.rectangle([8, 8, 56, 56], fill=frame_color, outline=(90, 60, 35, 255), width=2)
    # Mattress
    draw.rectangle([12, 12, 52, 52], fill=mattress)
    # Blanket (covers lower 2/3)
    draw.rectangle([12, 28, 52, 52], fill=blanket)
    # Pillow
    draw.ellipse([18, 14, 46, 26], fill=pillow, outline=(220, 220, 220, 255), width=1)
    
    return img

def create_rug(variation=1):
    """Create rug sprite (64x64 top-down)"""
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Rug colors
    if variation == 1:
        base = (180, 120, 80, 255)  # Persian red
        pattern = (140, 90, 60, 255)
        accent = (200, 180, 100, 255)
    elif variation == 2:
        base = (100, 140, 120, 255)  # Teal
        pattern = (70, 100, 90, 255)
        accent = (150, 200, 180, 255)
    else:
        base = (160, 160, 140, 255)  # Beige
        pattern = (130, 130, 110, 255)
        accent = (200, 200, 180, 255)
    
    # Rug base
    draw.rectangle([4, 8, 60, 56], fill=base, outline=pattern, width=2)
    
    # Pattern
    if variation == 1:
        # Central medallion
        draw.ellipse([24, 24, 40, 40], fill=accent, outline=pattern, width=1)
        # Border
        draw.rectangle([8, 12, 56, 52], outline=pattern, width=2)
    elif variation == 2:
        # Geometric pattern
        for i in range(4):
            x = 12 + i * 12
            draw.rectangle([x, 16, x+8, 48], fill=pattern)
            draw.rectangle([x+2, 20, x+6, 44], fill=accent)
    else:
        # Simple border
        draw.rectangle([10, 14, 54, 50], outline=accent, width=2)
        draw.rectangle([16, 20, 48, 44], outline=pattern, width=1)
    
    return img

def create_human_sprite(variation=1):
    """Create human character sprite sheet (32x48 with 4 directions)"""
    # Create sprite sheet: 4 columns (down, left, right, up) x 1 row
    img = Image.new('RGBA', (128, 48), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Colors
    skin = (255, 220, 180, 255)
    shirt = (100, 150, 200, 255) if variation == 1 else (200, 100, 100, 255) if variation == 2 else (100, 180, 100, 255)
    pants = (60, 60, 80, 255)
    hair = (80, 60, 40, 255)
    
    directions = [
        (0, 'down'), (32, 'left'), (64, 'right'), (96, 'up')
    ]
    
    for offset, direction in directions:
        center_x = offset + 16
        
        # Legs
        if direction in ['left', 'right']:
            draw.rectangle([center_x-6, 32, center_x-2, 46], fill=pants)
            draw.rectangle([center_x+2, 32, center_x+6, 46], fill=pants)
        else:
            draw.rectangle([center_x-5, 32, center_x-1, 46], fill=pants)
            draw.rectangle([center_x+1, 32, center_x+5, 46], fill=pants)
        
        # Body
        draw.rectangle([center_x-7, 18, center_x+7, 34], fill=shirt)
        
        # Arms
        if direction == 'left':
            draw.rectangle([center_x-9, 20, center_x-5, 32], fill=skin)
        elif direction == 'right':
            draw.rectangle([center_x+5, 20, center_x+9, 32], fill=skin)
        else:
            draw.rectangle([center_x-9, 20, center_x-5, 32], fill=skin)
            draw.rectangle([center_x+5, 20, center_x+9, 32], fill=skin)
        
        # Head
        draw.ellipse([center_x-6, 8, center_x+6, 20], fill=skin)
        
        # Hair
        if direction == 'up':
            draw.ellipse([center_x-6, 6, center_x+6, 14], fill=hair)
        elif direction == 'down':
            draw.arc([center_x-6, 6, center_x+6, 16], 0, 180, fill=hair, width=3)
        else:
            draw.arc([center_x-6, 6, center_x+6, 16], 0, 180, fill=hair, width=3)
    
    return img

def create_lobster_agent(variation=1):
    """Create lobster agent sprite (32x48)"""
    img = Image.new('RGBA', (128, 48), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Lobster colors
    shell = (220, 80, 60, 255)
    shell_dark = (180, 60, 40, 255)
    
    directions = [(0, 'down'), (32, 'left'), (64, 'right'), (96, 'up')]
    
    for offset, direction in directions:
        center_x = offset + 16
        
        # Tail/Body
        draw.ellipse([center_x-8, 20, center_x+8, 44], fill=shell)
        draw.ellipse([center_x-6, 16, center_x+6, 28], fill=shell_dark)
        
        # Claws
        if direction == 'left':
            draw.ellipse([center_x-14, 24, center_x-6, 32], fill=shell)
            draw.ellipse([center_x+2, 28, center_x+6, 36], fill=shell_dark)
        elif direction == 'right':
            draw.ellipse([center_x+6, 24, center_x+14, 32], fill=shell)
            draw.ellipse([center_x-6, 28, center_x-2, 36], fill=shell_dark)
        else:
            draw.ellipse([center_x-12, 24, center_x-4, 32], fill=shell)
            draw.ellipse([center_x+4, 24, center_x+12, 32], fill=shell)
        
        # Eyes
        if direction != 'up':
            draw.ellipse([center_x-4, 12, center_x-1, 16], fill=(255, 255, 255, 255))
            draw.ellipse([center_x+1, 12, center_x+4, 16], fill=(255, 255, 255, 255))
            draw.point([center_x-2, 14], fill=(0, 0, 0, 255))
            draw.point([center_x+2, 14], fill=(0, 0, 0, 255))
        
        # Antennae
        draw.line([(center_x-3, 10), (center_x-6, 4)], fill=shell_dark, width=1)
        draw.line([(center_x+3, 10), (center_x+6, 4)], fill=shell_dark, width=1)
    
    return img

def create_robot_agent(variation=1):
    """Create robot agent sprite (32x48)"""
    img = Image.new('RGBA', (128, 48), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Robot colors
    body = (180, 180, 190, 255)
    body_dark = (140, 140, 150, 255)
    accent = (100, 200, 255, 255) if variation == 1 else (255, 200, 100, 255)
    
    directions = [(0, 'down'), (32, 'left'), (64, 'right'), (96, 'up')]
    
    for offset, direction in directions:
        center_x = offset + 16
        
        # Wheels/Track
        draw.rounded_rectangle([center_x-8, 38, center_x+8, 46], radius=2, fill=(80, 80, 80, 255))
        
        # Body
        draw.rounded_rectangle([center_x-8, 20, center_x+8, 40], radius=3, fill=body, outline=body_dark, width=1)
        
        # Head
        draw.rounded_rectangle([center_x-6, 10, center_x+6, 22], radius=2, fill=body, outline=body_dark, width=1)
        
        # Eye/Visor
        if direction == 'left':
            draw.rectangle([center_x-5, 14, center_x-1, 18], fill=accent)
        elif direction == 'right':
            draw.rectangle([center_x+1, 14, center_x+5, 18], fill=accent)
        else:
            draw.rectangle([center_x-4, 14, center_x+4, 18], fill=accent)
        
        # Antenna
        draw.line([(center_x, 10), (center_x, 4)], fill=body_dark, width=2)
        draw.ellipse([center_x-2, 2, center_x+2, 6], fill=(255, 100, 100, 255))
    
    return img

def create_button(variation=1):
    """Create UI button (various sizes, return 64x32)"""
    img = Image.new('RGBA', (64, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Button colors
    if variation == 1:
        base = (100, 150, 200, 255)
        shadow = (70, 110, 150, 255)
    elif variation == 2:
        base = (120, 180, 120, 255)
        shadow = (80, 140, 80, 255)
    else:
        base = (200, 160, 100, 255)
        shadow = (160, 120, 70, 255)
    
    # Button shape
    draw.rounded_rectangle([2, 2, 62, 30], radius=6, fill=base, outline=shadow, width=2)
    # Highlight
    draw.rounded_rectangle([4, 4, 60, 14], radius=4, fill=(255, 255, 255, 50))
    
    return img

def create_panel(variation=1):
    """Create UI panel (128x128)"""
    img = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Panel colors
    base = (60, 50, 45, 230) if variation == 1 else (45, 55, 65, 230)
    border = (120, 100, 80, 255) if variation == 1 else (100, 120, 140, 255)
    
    # Main panel
    draw.rounded_rectangle([0, 0, 127, 127], radius=8, fill=base, outline=border, width=3)
    # Inner bevel
    draw.rounded_rectangle([6, 6, 121, 121], radius=6, outline=(255, 255, 255, 30), width=1)
    
    return img

def create_coin_icon(variation=1):
    """Create coin icon (32x32)"""
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Coin colors
    gold = (255, 200, 50, 255)
    gold_dark = (200, 150, 30, 255)
    gold_light = (255, 230, 120, 255)
    
    # Coin body
    draw.ellipse([4, 4, 28, 28], fill=gold, outline=gold_dark, width=2)
    # Inner circle
    draw.ellipse([10, 10, 22, 22], fill=gold_light)
    # $ symbol
    draw.text((12, 8), "$", fill=gold_dark)
    
    return img

def create_heart_icon(variation=1):
    """Create heart icon (32x32)"""
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Heart color
    if variation == 1:
        color = (220, 80, 100, 255)
        shadow = (180, 50, 70, 255)
    else:
        color = (255, 150, 150, 255)
        shadow = (220, 100, 100, 255)
    
    # Draw heart shape using pixels
    heart_pixels = [
        (8, 6), (9, 6), (22, 6), (23, 6),
        (7, 7), (8, 7), (9, 7), (10, 7), (21, 7), (22, 7), (23, 7), (24, 7),
        (6, 8), (7, 8), (8, 8), (9, 8), (10, 8), (11, 8), (20, 8), (21, 8), (22, 8), (23, 8), (24, 8), (25, 8),
        (6, 9), (7, 9), (8, 9), (9, 9), (10, 9), (11, 9), (12, 9), (19, 9), (20, 9), (21, 9), (22, 9), (23, 9), (24, 9), (25, 9),
        (6, 10), (7, 10), (8, 10), (9, 10), (10, 10), (11, 10), (12, 10), (13, 10), (18, 10), (19, 10), (20, 10), (21, 10), (22, 10), (23, 10), (24, 10), (25, 10),
        (7, 11), (8, 11), (9, 11), (10, 11), (11, 11), (12, 11), (13, 11), (14, 11), (17, 11), (18, 11), (19, 11), (20, 11), (21, 11), (22, 11), (23, 11), (24, 11),
        (8, 12), (9, 12), (10, 12), (11, 12), (12, 12), (13, 12), (14, 12), (15, 12), (16, 12), (17, 12), (18, 12), (19, 12), (20, 12), (21, 12), (22, 12), (23, 12),
        (9, 13), (10, 13), (11, 13), (12, 13), (13, 13), (14, 13), (15, 13), (16, 13), (17, 13), (18, 13), (19, 13), (20, 13), (21, 13), (22, 13),
        (10, 14), (11, 14), (12, 14), (13, 14), (14, 14), (15, 14), (16, 14), (17, 14), (18, 14), (19, 14), (20, 14), (21, 14),
        (11, 15), (12, 15), (13, 15), (14, 15), (15, 15), (16, 15), (17, 15), (18, 15), (19, 15), (20, 15),
        (12, 16), (13, 16), (14, 16), (15, 16), (16, 16), (17, 16), (18, 16), (19, 16),
        (13, 17), (14, 17), (15, 17), (16, 17), (17, 17), (18, 17),
        (14, 18), (15, 18), (16, 18), (17, 18),
        (15, 19), (16, 19),
    ]
    
    for x, y in heart_pixels:
        draw.point((x, y), fill=color)
    
    return img

def main():
    """Generate all assets"""
    assets_dir = "/home/zak/.openclaw/workspace/cozy-claw-studio/shared-house/public/assets/"
    os.makedirs(assets_dir, exist_ok=True)
    
    print("🎨 Cozy Claw Studio - Art Asset Generator")
    print("=" * 50)
    
    generated_files = []
    
    # 1. Floor tilesets (32x32)
    print("\n📦 Generating Floor Tilesets...")
    for v in range(1, 4):
        generated_files.append(save_img(create_floor_wood(v), f"floor_wood_v{v}.png"))
        generated_files.append(save_img(create_floor_carpet(v), f"floor_carpet_v{v}.png"))
        generated_files.append(save_img(create_floor_tiles(v), f"floor_tiles_v{v}.png"))
        generated_files.append(save_img(create_wall_brick(v), f"wall_brick_v{v}.png"))
        generated_files.append(save_img(create_wall_paint(v), f"wall_paint_v{v}.png"))
    
    # Also create default versions
    save_img(create_floor_wood(1), "floor_wood.png")
    save_img(create_floor_carpet(1), "floor_carpet.png")
    save_img(create_floor_tiles(1), "floor_tiles.png")
    save_img(create_wall_brick(1), "wall_brick.png")
    save_img(create_wall_paint(1), "wall_paint.png")
    
    # 2. Furniture sprites (64x64)
    print("\n🛋️ Generating Furniture Sprites...")
    for v in range(1, 4):
        generated_files.append(save_img(create_sofa(v), f"sofa_v{v}.png"))
        generated_files.append(save_img(create_sofa(v+1), f"sofa_fancy_v{v}.png"))
        generated_files.append(save_img(create_plant(v, big=False), f"plant_v{v}.png"))
        generated_files.append(save_img(create_plant(v+1, big=True), f"plant_big_v{v}.png"))
        generated_files.append(save_img(create_tv(v), f"tv_v{v}.png"))
        generated_files.append(save_img(create_bookshelf(v), f"bookshelf_v{v}.png"))
        generated_files.append(save_img(create_table(v, dining=False), f"coffee_table_v{v}.png"))
        generated_files.append(save_img(create_table(v, dining=True), f"dining_table_v{v}.png"))
        generated_files.append(save_img(create_lamp(v), f"lamp_v{v}.png"))
        generated_files.append(save_img(create_bed(v), f"bed_v{v}.png"))
        generated_files.append(save_img(create_rug(v), f"rug_v{v}.png"))
    
    # Default versions
    save_img(create_sofa(1), "sofa.png")
    save_img(create_sofa(2), "sofa_fancy.png")
    save_img(create_plant(1, False), "plant.png")
    save_img(create_plant(2, True), "plant_big.png")
    save_img(create_tv(1), "tv.png")
    save_img(create_bookshelf(1), "bookshelf.png")
    save_img(create_table(1, False), "coffee_table.png")
    save_img(create_table(1, True), "dining_table.png")
    save_img(create_lamp(1), "lamp.png")
    save_img(create_bed(1), "bed.png")
    save_img(create_rug(1), "rug.png")
    
    # 3. Character sprites (32x48, 4-direction sprite sheets)
    print("\n👤 Generating Character Sprites...")
    for v in range(1, 4):
        generated_files.append(save_img(create_human_sprite(v), f"human_walk_v{v}.png"))
        generated_files.append(save_img(create_lobster_agent(v), f"agent_lobster_v{v}.png"))
        generated_files.append(save_img(create_robot_agent(v), f"agent_robot_v{v}.png"))
    
    # Default versions
    save_img(create_human_sprite(1), "human_walk.png")
    save_img(create_lobster_agent(1), "agent_lobster.png")
    save_img(create_robot_agent(1), "agent_robot.png")
    
    # 4. UI Elements
    print("\n🖱️ Generating UI Elements...")
    for v in range(1, 4):
        generated_files.append(save_img(create_button(v), f"button_v{v}.png"))
        generated_files.append(save_img(create_panel(v), f"panel_v{v}.png"))
        generated_files.append(save_img(create_coin_icon(v), f"coin_icon_v{v}.png"))
        generated_files.append(save_img(create_heart_icon(v), f"heart_icon_v{v}.png"))
    
    # Default versions
    save_img(create_button(1), "button.png")
    save_img(create_panel(1), "panel.png")
    save_img(create_coin_icon(1), "coin_icon.png")
    save_img(create_heart_icon(1), "heart_icon.png")
    
    print("\n" + "=" * 50)
    print(f"✅ Generated {len(generated_files) + 22} total assets!")
    print(f"📁 Assets saved to: {assets_dir}")
    
    # List all files
    print("\n📋 Asset List:")
    for f in sorted(os.listdir(assets_dir)):
        size = os.path.getsize(os.path.join(assets_dir, f))
        print(f"   📄 {f} ({size} bytes)")

if __name__ == "__main__":
    main()
