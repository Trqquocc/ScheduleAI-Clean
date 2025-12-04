import os
G = []

def Init(part, G):
    f = open(part)
    n = int(f.readline().strip(), base=10)
    
    # Khởi tạo ma trận G
    for i in range(n+1):
        G.append([])
        for j in range(n+1):
            G[i].append(0)
    
    while True:
        string = f.readline()
        if not string:
            break
        
        # Loại bỏ ký tự xuống dòng và khoảng trắng thừa
        string = string.strip()
        if not string:  # Bỏ qua dòng trống
            continue
            
        # Thay thế tab bằng space
        string = string.replace('\t', ' ')
        
        # Tách các số từ chuỗi
        parts = string.split()
        if len(parts) >= 3:
            i = int(parts[0])
            j = int(parts[1])
            x = int(parts[2])
            G[i][j] = G[j][i] = x
    
    f.close()
    return n

def ViewMatrix(G, n):
    for i in range(1, n+1):
        for j in range(1, n+1):
            print("%d " % G[i][j], end='') 
        print()

def main():
    n = Init("D:/DTU2025/CDIO3/AI/luudinh1.txt", G)
    print("Xem ma trận G:")
    ViewMatrix(G, n)

if __name__ == "__main__":
    main()